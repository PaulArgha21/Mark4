export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, serverError } from '@/lib/api-response'

function toCard(p: any) {
  const imgs = (p.media ?? []).map((m: any) => m.url)
  if (!imgs.length) imgs.push('/placeholder.svg')
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? null,
    images: imgs,
    basePrice: Number(p.basePrice),
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    averageRating: Number(p.averageRating ?? 0),
    reviewCount: Number(p.reviewCount ?? 0),
    discountPercent: p.salePrice
      ? Math.round((1 - Number(p.salePrice) / Number(p.basePrice)) * 100)
      : 0,
    isNew: (Date.now() - new Date(p.createdAt).getTime()) / (864e5) < 14,
    colors: (p.variants ?? [])
      .filter((v: any) => v.color)
      .reduce((acc: any[], v: any) => {
        if (!acc.find(c => c.name === v.color)) acc.push({ name: v.color, hex: v.colorHex })
        return acc
      }, []),
  }
}

const MEDIA_SELECT = {
  where: { isPrimary: true },
  take: 2,
  orderBy: { sortOrder: 'asc' as const },
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') ?? undefined
    const recentlyViewedIds = (searchParams.get('rv') ?? '').split(',').filter(Boolean)

    // Load the current product
    const product = await db.product.findUnique({
      where: { slug: params.slug, isActive: true },
      select: {
        id: true,
        categoryId: true,
        basePrice: true,
        tags: { include: { tag: { select: { id: true } } } },
        collections: { select: { collectionId: true }, take: 3 },
      },
    })
    if (!product) return ok({ topMatches: [], peopleAlsoBuy: [], justBecauseYouSaw: [], personalised: [] })

    const tagIds = product.tags.map(t => t.tag.id)
    const collectionIds = product.collections.map(c => c.collectionId)
    const priceRange = { gte: Number(product.basePrice) * 0.5, lte: Number(product.basePrice) * 2 }

    const baseInclude = {
      media: MEDIA_SELECT,
      variants: {
        where: { isActive: true },
        select: { color: true, colorHex: true, size: true },
        take: 10,
      },
    }

    // ── 1. Top Matches: same category + overlapping tags ──
    const topMatchesRaw = await db.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        categoryId: product.categoryId ?? undefined,
        tags: tagIds.length > 0 ? { some: { tagId: { in: tagIds } } } : undefined,
        basePrice: priceRange,
      },
      orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
      take: 10,
      include: baseInclude,
    })

    // ── 2. People Also Buy: co-purchased products (from order items) ──
    let peopleAlsoBuyRaw: any[] = []
    try {
      // Find orders that contain this product
      const ordersWithProduct = await db.orderItem.findMany({
        where: { productId: product.id },
        select: { orderId: true },
        take: 100,
      })
      const orderIds = ordersWithProduct.map(o => o.orderId)

      if (orderIds.length > 0) {
        // Find other products bought in those orders
        const coPurchased = await db.orderItem.groupBy({
          by: ['productId'],
          where: {
            orderId: { in: orderIds },
            productId: { not: product.id },
          },
          _count: { productId: true },
          orderBy: { _count: { productId: 'desc' } },
          take: 10,
        })

        if (coPurchased.length > 0) {
          peopleAlsoBuyRaw = await db.product.findMany({
            where: {
              isActive: true,
              id: { in: coPurchased.map(c => c.productId) },
            },
            take: 8,
            include: baseInclude,
          })
        }
      }
    } catch { /* co-purchase query optional */ }

    // Fallback: same category, high rated
    if (peopleAlsoBuyRaw.length < 4) {
      const extra = await db.product.findMany({
        where: {
          isActive: true,
          id: { not: product.id, notIn: peopleAlsoBuyRaw.map(p => p.id) },
          categoryId: product.categoryId ?? undefined,
        },
        orderBy: { reviewCount: 'desc' },
        take: 8 - peopleAlsoBuyRaw.length,
        include: baseInclude,
      })
      peopleAlsoBuyRaw = [...peopleAlsoBuyRaw, ...extra]
    }

    // ── 3. Just Because You Saw This: related by tags / same collection ──
    const justBecauseRaw = await db.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id, notIn: topMatchesRaw.map(p => p.id) },
        OR: [
          ...(collectionIds.length > 0 ? [{ collections: { some: { collectionId: { in: collectionIds } } } }] : []),
          ...(tagIds.length > 0 ? [{ tags: { some: { tagId: { in: tagIds } } } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: baseInclude,
    })

    // ── 4. Personalised: recently viewed + similar price range ──
    let personalisedRaw: any[] = []
    if (recentlyViewedIds.length > 0) {
      // Products similar to recently viewed ones
      const rvProducts = await db.product.findMany({
        where: { id: { in: recentlyViewedIds.slice(0, 5) } },
        select: { categoryId: true, basePrice: true },
      })
      const rvCategoryIds = Array.from(new Set(rvProducts.map(p => p.categoryId).filter(Boolean)))
      const avgPrice = rvProducts.reduce((s, p) => s + Number(p.basePrice), 0) / (rvProducts.length || 1)

      personalisedRaw = await db.product.findMany({
        where: {
          isActive: true,
          id: { not: product.id, notIn: recentlyViewedIds },
          categoryId: rvCategoryIds.length > 0 ? { in: rvCategoryIds as string[] } : undefined,
          basePrice: { gte: avgPrice * 0.6, lte: avgPrice * 1.8 },
        },
        orderBy: [{ isFeatured: 'desc' }, { averageRating: 'desc' }],
        take: 10,
        include: baseInclude,
      })
    }

    // Fallback personalised: featured products
    if (personalisedRaw.length < 4) {
      const extra = await db.product.findMany({
        where: {
          isActive: true,
          isFeatured: true,
          id: { not: product.id, notIn: personalisedRaw.map(p => p.id) },
        },
        orderBy: { averageRating: 'desc' },
        take: 10 - personalisedRaw.length,
        include: baseInclude,
      })
      personalisedRaw = [...personalisedRaw, ...extra]
    }

    return ok({
      topMatches: topMatchesRaw.slice(0, 8).map(toCard),
      peopleAlsoBuy: peopleAlsoBuyRaw.slice(0, 8).map(toCard),
      justBecauseYouSaw: justBecauseRaw.slice(0, 8).map(toCard),
      personalised: personalisedRaw.slice(0, 8).map(toCard),
    })
  } catch (err) {
    console.error('Recommendations API error:', err)
    return serverError()
  }
}
