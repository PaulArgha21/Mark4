export const runtime = 'nodejs'

import { redis } from '@/lib/redis'
import { db } from '@/lib/db'
import { ok } from '@/lib/api-response'
import { z } from 'zod'

const querySchema = z.object({
  contextType: z.enum(['homepage', 'pdp', 'cart', 'checkout', 'category', 'search', 'account']),
  contextId:   z.string().optional(),
  limit:       z.coerce.number().min(1).max(24).default(8),
  userId:      z.string().optional(),
  sessionId:   z.string().optional(),
  exclude:     z.string().optional(), // comma-separated product IDs to exclude
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) return ok({ productIds: [], products: [], strategy: 'error', cached: false })

  const { contextType, contextId, limit, userId, sessionId, exclude } = parsed.data
  const excludeIds = exclude ? exclude.split(',').map(s => s.trim()) : []

  try {
    // 1. Check Redis cache
    const cacheKey = userId
      ? `ml:rec:${userId}:${contextType}:${contextId ?? 'null'}`
      : `ml:rec:session:${sessionId ?? 'anon'}:${contextType}:${contextId ?? 'null'}`

    const cached = await redis.get<string[]>(cacheKey)
    if (cached && Array.isArray(cached)) {
      const filteredIds = cached.filter(id => !excludeIds.includes(id)).slice(0, limit)
      const products = await getProductsByIds(filteredIds)
      return ok({ productIds: filteredIds, products, strategy: 'cached', cached: true })
    }

    // 2. Try external ML service (with 3s timeout)
    let productIds: string[] = []
    let strategy = 'trending_fallback'

    if (process.env.ML_SERVICE_URL) {
      try {
        const mlRes = await fetch(`${process.env.ML_SERVICE_URL}/recommend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ML_SERVICE_SECRET ?? ''}`,
          },
          body: JSON.stringify({ userId, sessionId, contextType, contextId, limit: limit + excludeIds.length }),
          signal: AbortSignal.timeout(3000),
        })

        if (mlRes.ok) {
          const data = await mlRes.json()
          productIds = (data.productIds ?? []).filter((id: string) => !excludeIds.includes(id))
          strategy = data.strategy ?? 'ml_collaborative'
        }
      } catch {
        // ML service unavailable — fallback silently
      }
    }

    // 3. Collaborative filtering fallback: "users who viewed X also viewed Y"
    if (productIds.length < limit && contextType === 'pdp' && contextId) {
      const coViewed = await getCoViewedProducts(contextId, limit - productIds.length, [...excludeIds, ...productIds])
      if (coViewed.length > 0) {
        productIds = [...productIds, ...coViewed]
        if (strategy === 'trending_fallback') strategy = 'co_viewed'
      }
    }

    // 4. Category affinity fallback: user's most-viewed categories
    if (productIds.length < limit && userId) {
      const affinity = await getCategoryAffinityProducts(userId, limit - productIds.length, [...excludeIds, ...productIds])
      if (affinity.length > 0) {
        productIds = [...productIds, ...affinity]
        if (strategy === 'trending_fallback') strategy = 'category_affinity'
      }
    }

    // 5. Final fallback: trending products
    if (productIds.length < limit) {
      const trending = await db.trendingScore.findMany({
        where: {
          score: { gt: 0 },
          productId: { notIn: [...excludeIds, ...productIds] },
          product: { isActive: true },
        },
        orderBy: { score: 'desc' },
        take: limit - productIds.length,
        select: { productId: true },
      })
      productIds = [...productIds, ...trending.map(t => t.productId)]
    }

    // 6. If STILL empty, grab newest active products
    if (productIds.length === 0) {
      const newest = await db.product.findMany({
        where: { isActive: true, id: { notIn: excludeIds } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true },
      })
      productIds = newest.map(p => p.id)
      strategy = 'newest_fallback'
    }

    // Cache for 1 hour
    if (productIds.length > 0) {
      await redis.set(cacheKey, JSON.stringify(productIds), { ex: 3600 })
    }

    const products = await getProductsByIds(productIds.slice(0, limit))
    return ok({ productIds: productIds.slice(0, limit), products, strategy, cached: false })
  } catch (err) {
    console.error('ML recommend error:', err)
    return ok({ productIds: [], products: [], strategy: 'error', cached: false })
  }
}

// ─── Helpers ────────────────────────────────────────────────────

async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return []
  const products = await db.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: {
      media: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
      category: { select: { name: true, slug: true } },
      trendingScore: { select: { score: true, viewCount24h: true } },
    },
  })
  // Preserve order from IDs
  const map = new Map(products.map(p => [p.id, {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    basePrice: Number(p.basePrice),
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    image: p.media[0]?.url ?? null,
    category: p.category?.name ?? null,
    trendingScore: p.trendingScore?.score ?? 0,
  }]))
  return ids.map(id => map.get(id)).filter(Boolean)
}

async function getCoViewedProducts(productId: string, limit: number, excludeIds: string[]): Promise<string[]> {
  // Find users/sessions that viewed this product, then find other products they viewed
  const viewers = await db.userEvent.findMany({
    where: {
      productId,
      eventType: { in: ['page_view', 'product_view'] },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { userId: true, sessionId: true },
    take: 100,
  })

  const userIds = Array.from(new Set(viewers.map(v => v.userId).filter(Boolean))) as string[]
  const sessionIds = Array.from(new Set(viewers.map(v => v.sessionId).filter(Boolean))) as string[]

  if (userIds.length === 0 && sessionIds.length === 0) return []

  const coViewed = await db.userEvent.groupBy({
    by: ['productId'],
    where: {
      productId: { not: null, notIn: [productId, ...excludeIds] },
      eventType: { in: ['page_view', 'product_view', 'add_to_cart'] },
      OR: [
        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
        ...(sessionIds.length > 0 ? [{ sessionId: { in: sessionIds } }] : []),
      ],
    },
    _count: { productId: true },
    orderBy: { _count: { productId: 'desc' } },
    take: limit,
  })

  return coViewed.map(c => c.productId!).filter(Boolean) as string[]
}

async function getCategoryAffinityProducts(userId: string, limit: number, excludeIds: string[]): Promise<string[]> {
  // Find user's most-interacted categories
  const categoryEvents = await db.userEvent.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      categoryId: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _count: { categoryId: true },
    orderBy: { _count: { categoryId: 'desc' } },
    take: 3,
  })

  const categoryIds = categoryEvents.map(c => c.categoryId!).filter(Boolean) as string[]
  if (categoryIds.length === 0) return []

  const products = await db.product.findMany({
    where: {
      categoryId: { in: categoryIds },
      isActive: true,
      id: { notIn: excludeIds },
    },
    orderBy: { averageRating: 'desc' },
    take: limit,
    select: { id: true },
  })

  return products.map(p => p.id)
}
