export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { ok, serverError } from '@/lib/api-response'
import { CACHE_KEYS } from '@/lib/cache'

const CACHE_TTL = 300 // 5 minutes

export async function GET() {
  try {
    // 1. Try Redis cache (fail-safe)
    try {
      const cached = await redis.get(CACHE_KEYS.navigation)
      if (cached) {
        return ok(typeof cached === 'string' ? JSON.parse(cached) : cached)
      }
    } catch (cacheErr) {
      console.warn('Categories cache read failed:', cacheErr)
    }

    // 2. Fetch categories with product count
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        parentId: true,
        sortOrder: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    })

    // 3. Build tree structure
    const topLevel = categories.filter(c => !c.parentId)
    const result = topLevel.map(parent => ({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      image: parent.image,
      productCount: parent._count.products,
      children: categories
        .filter(c => c.parentId === parent.id)
        .map(child => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          image: child.image,
          productCount: child._count.products,
        })),
    }))

    // 4. Cache (fail-safe)
    try {
      await redis.set(CACHE_KEYS.navigation, JSON.stringify(result), { ex: CACHE_TTL })
    } catch (cacheErr) {
      console.warn('Categories cache write failed:', cacheErr)
    }

    return ok(result)
  } catch (err) {
    console.error('Categories API error:', err)
    return serverError()
  }
}
