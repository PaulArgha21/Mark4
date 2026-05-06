export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { ok, notFound, serverError } from '@/lib/api-response'
import { CACHE_KEYS } from '@/lib/cache'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // 1. Try cache (fail-safe)
    const cacheKey = CACHE_KEYS.product(params.slug)
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return ok(typeof cached === 'string' ? JSON.parse(cached) : cached)
      }
    } catch (cacheErr) {
      console.warn('Product cache read failed:', cacheErr)
    }

    // 2. Fetch product with all relations
    const product = await db.product.findUnique({
      where: { slug: params.slug, isActive: true },
      include: {
        category: { include: { parent: { select: { name: true, slug: true } } } },
        media: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            inventory: { select: { quantity: true, reserved: true } },
            media: { orderBy: { sortOrder: 'asc' } },
          },
        },
        tags: { include: { tag: true } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { name: true, image: true } },
          },
        },
        collections: {
          include: {
            collection: {
              select: {
                name: true, slug: true,
                products: {
                  take: 6,
                  include: {
                    product: {
                      select: {
                        id: true, name: true, slug: true, basePrice: true, salePrice: true,
                        media: { where: { isPrimary: true }, take: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
          take: 1,
        },
        trendingScore: true,
      },
    })

    if (!product) return notFound('Product not found')

    // 3. Compute available inventory per variant
    const variantsWithStock = product.variants.map(v => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      priceDelta: Number(v.priceDelta),
      sortOrder: v.sortOrder,
      media: v.media,
      availableQty: Math.max(0, (v.inventory?.quantity ?? 0) - (v.inventory?.reserved ?? 0)),
    }))

    // 4. Rating distribution
    const ratingCounts = await db.review.groupBy({
      by: ['rating'],
      where: { productId: product.id, isApproved: true },
      _count: { rating: true },
    })

    // 5. Same-collection products
    const sameCollectionProducts = (product.collections[0]?.collection.products ?? [])
      .filter(cp => cp.product.id !== product.id)
      .map(cp => {
        const imgs = cp.product.media.map(m => m.url)
        if (imgs.length === 0) imgs.push('/placeholder.svg')
        return {
          id: cp.product.id,
          slug: cp.product.slug,
          name: cp.product.name,
          brand: null,
          images: imgs,
          basePrice: Number(cp.product.basePrice),
          salePrice: cp.product.salePrice ? Number(cp.product.salePrice) : null,
          averageRating: 0,
          reviewCount: 0,
        }
      })

    const allImages = product.media.map(m => m.url)
    if (allImages.length === 0) allImages.push('/placeholder.svg')

    const data = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      description: product.description,
      images: allImages,
      basePrice: Number(product.basePrice),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      averageRating: Number(product.averageRating ?? 0),
      reviewCount: Number(product.reviewCount ?? 0),
      category: product.category,
      media: product.media,
      variants: variantsWithStock,
      tags: product.tags.map(t => ({ name: t.tag.name, slug: t.tag.slug })),
      reviews: product.reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.comment,
        images: r.images,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
      })),
      ratingDistribution: [5, 4, 3, 2, 1].map(r => ({
        rating: r,
        count: ratingCounts.find(rc => rc.rating === r)?._count.rating ?? 0,
      })),
      sameCollectionProducts,
      trendingScore: product.trendingScore?.score ?? null,
    }

    // 6. Cache for 2 minutes (fail-safe)
    try {
      await redis.set(cacheKey, JSON.stringify(data), { ex: 120 })
    } catch (cacheErr) {
      console.warn('Product cache write failed:', cacheErr)
    }

    return ok(data)
  } catch (err) {
    console.error('Product detail API error:', err)
    return serverError()
  }
}
