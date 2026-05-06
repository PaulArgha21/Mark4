export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const querySchema = z.object({
  categoryId:   z.string().optional(),
  collectionId: z.string().optional(),
  size:         z.string().optional(),          // comma-separated: "S,M,L"
  color:        z.string().optional(),          // comma-separated
  priceMin:     z.coerce.number().optional(),
  priceMax:     z.coerce.number().optional(),
  rating:       z.coerce.number().min(1).max(5).optional(),
  discount:     z.coerce.number().optional(),
  sort:         z.enum(['popular','newest','price_asc','price_desc','rating']).default('popular'),
  page:         z.coerce.number().min(1).default(1),
  limit:        z.coerce.number().min(1).max(48).default(24),
  q:            z.string().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return badRequest('Invalid query params', parsed.error.flatten())

  const { categoryId, collectionId, size, color, priceMin, priceMax,
          rating, discount, sort, page, limit, q } = parsed.data

  try {
    // Build where clause
    const where: Prisma.ProductWhereInput = { isActive: true }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (collectionId) where.collections = { some: { collectionId } }

    if (priceMin || priceMax) {
      where.basePrice = {}
      if (priceMin) where.basePrice.gte = priceMin
      if (priceMax) where.basePrice.lte = priceMax
    }

    if (rating) where.averageRating = { gte: rating }

    if (size) {
      const sizes = size.split(',')
      where.variants = { some: { size: { in: sizes }, isActive: true } }
    }

    if (color) {
      const colors = color.split(',')
      where.variants = {
        some: {
          ...(where.variants as Prisma.ProductVariantListRelationFilter)?.some,
          color: { in: colors },
          isActive: true,
        },
      }
    }

    // Sort
    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'newest':    return { createdAt: 'desc' as const }
        case 'price_asc': return { basePrice: 'asc' as const }
        case 'price_desc':return { basePrice: 'desc' as const }
        case 'rating':    return { averageRating: 'desc' as const }
        case 'popular':
        default:          return { reviewCount: 'desc' as const }
      }
    })()

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          media: { where: { isPrimary: true }, take: 2, orderBy: { sortOrder: 'asc' } },
          variants: {
            where: { isActive: true },
            select: { size: true, color: true, colorHex: true, inventory: { select: { quantity: true } } },
          },
          trendingScore: { select: { score: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      db.product.count({ where }),
    ])

    // Transform to card-friendly shape
    const items = products.map(p => {
      const imgs = p.media.map(m => m.url)
      if (imgs.length === 0) imgs.push('/placeholder.svg')
      const daysSince = (Date.now() - new Date(p.createdAt).getTime()) / (1000*60*60*24)
      return {
      id:             p.id,
      slug:           p.slug,
      name:           p.name,
      brand:          p.brand,
      images:         imgs,
      basePrice:      Number(p.basePrice),
      salePrice:      p.salePrice ? Number(p.salePrice) : null,
      averageRating:  Number(p.averageRating ?? 0),
      reviewCount:    Number(p.reviewCount ?? 0),
      isNew:          daysSince < 14,
      availableSizes: Array.from(new Set(p.variants.map(v => v.size).filter(Boolean))) as string[],
      colors:         Array.from(new Map(
        p.variants.filter(v => v.color).map(v => [v.color, { name: v.color!, hex: v.colorHex ?? undefined }] as const)
      ).values()),
      discountPercent: p.salePrice
        ? Math.round((1 - Number(p.salePrice) / Number(p.basePrice)) * 100)
        : 0,
      category:       p.category,
      trendingScore:  p.trendingScore?.score ?? null,
    }})

    // Post-filter by discount if specified
    const finalItems = discount
      ? items.filter(item => item.discountPercent >= discount)
      : items

    return ok({
      items: finalItems,
      pagination: {
        page,
        limit,
        total: discount ? finalItems.length : total,
        totalPages: Math.ceil((discount ? finalItems.length : total) / limit),
        hasMore: page * limit < (discount ? finalItems.length : total),
      },
    })
  } catch (err) {
    console.error('Products API error:', err)
    return serverError()
  }
}
