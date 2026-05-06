export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { subDays, subHours } from 'date-fns'

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'analytics.full')
  if (error) return error

  try {
    const now = new Date()
    const last7d = subDays(now, 7)
    const last24h = subHours(now, 24)
    const last30d = subDays(now, 30)

    // ── 1. Auto-Bundle Suggestions (frequently co-purchased products) ──
    const purchaseEvents = await db.userEvent.findMany({
      where: { eventType: 'purchase', productId: { not: null }, createdAt: { gte: last30d } },
      select: { userId: true, sessionId: true, productId: true },
    })

    // Group by user/session to find co-purchases
    const userPurchaseMap = new Map<string, string[]>()
    for (const e of purchaseEvents) {
      const key = e.userId ?? e.sessionId ?? ''
      if (!key || !e.productId) continue
      const existing = userPurchaseMap.get(key) ?? []
      existing.push(e.productId)
      userPurchaseMap.set(key, existing)
    }

    // Count product pair co-occurrences
    const pairCounts = new Map<string, number>()
    for (const [, products] of Array.from(userPurchaseMap.entries())) {
      if (products.length < 2) continue
      const unique = Array.from(new Set(products))
      for (let i = 0; i < unique.length; i++) {
        for (let j = i + 1; j < unique.length; j++) {
          const pair = [unique[i], unique[j]].sort().join('|')
          pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1)
        }
      }
    }

    // Top 5 bundle suggestions
    const topPairs = Array.from(pairCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const allPairProductIds = Array.from(new Set(topPairs.flatMap(([pair]) => pair.split('|'))))
    const pairProducts = await db.product.findMany({
      where: { id: { in: allPairProductIds } },
      select: { id: true, name: true, slug: true, brand: true, basePrice: true, salePrice: true,
        media: { where: { isPrimary: true }, take: 1, select: { url: true } } },
    })
    const productMap = new Map(pairProducts.map(p => [p.id, p]))

    const bundleSuggestions = topPairs.map(([pair, count]) => {
      const [id1, id2] = pair.split('|')
      return {
        products: [productMap.get(id1), productMap.get(id2)].filter(Boolean),
        coPurchaseCount: count,
        suggestedDiscount: count >= 10 ? 15 : count >= 5 ? 10 : 5,
      }
    })

    // ── 2. Trending Categories (surge in views/purchases) ──
    const categoryViews7d = await db.userEvent.groupBy({
      by: ['categoryId'],
      where: { categoryId: { not: null }, createdAt: { gte: last7d } },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 10,
    })

    const categoryIds = categoryViews7d.map(c => c.categoryId!).filter(Boolean) as string[]
    const categories = await db.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, slug: true },
    })
    const catMap = new Map(categories.map(c => [c.id, c]))

    const trendingCategories = categoryViews7d.map(cv => ({
      category: catMap.get(cv.categoryId!) ?? { name: 'Unknown' },
      viewCount7d: cv._count.categoryId,
    }))

    // ── 3. Promotion Recommendations ──
    // Products with high views but low conversion → suggest discount
    const highViewProducts = await db.trendingScore.findMany({
      where: { viewCount24h: { gte: 5 }, purchase24h: 0 },
      orderBy: { viewCount24h: 'desc' },
      take: 10,
      include: { product: { select: { id: true, name: true, slug: true, brand: true, basePrice: true, salePrice: true,
        media: { where: { isPrimary: true }, take: 1, select: { url: true } } } } },
    })

    const promoRecommendations = highViewProducts.map(ts => ({
      product: ts.product,
      views24h: ts.viewCount24h,
      addToCart24h: ts.addToCart24h,
      purchases24h: ts.purchase24h,
      conversionGap: ts.viewCount24h > 0 ? Math.round(((ts.viewCount24h - ts.purchase24h) / ts.viewCount24h) * 100) : 0,
      suggestion: ts.addToCart24h > 0 ? 'Price too high — consider a limited discount' : 'Low engagement — feature in hero banner or collection',
    }))

    // ── 4. Inventory Insights (overstocked + slow movers) ──
    const overstockedInventory = await db.inventory.findMany({
      where: { quantity: { gte: 100 } },
      orderBy: { quantity: 'desc' },
      take: 10,
      select: {
        quantity: true, reserved: true,
        variant: {
          select: { id: true, sku: true, size: true, color: true,
            product: { select: { id: true, name: true, slug: true } } },
        },
      },
    })
    const overstocked = overstockedInventory.map(inv => ({
      variant: inv.variant,
      quantity: inv.quantity,
      reserved: inv.reserved,
      netAvailable: inv.quantity - inv.reserved,
    }))

    // ── 5. Revenue Opportunity Score ──
    const [totalViews24h, totalPurchases24h, abandonedCarts7d] = await Promise.all([
      db.userEvent.count({ where: { eventType: { in: ['page_view', 'product_view'] }, createdAt: { gte: last24h } } }),
      db.userEvent.count({ where: { eventType: 'purchase', createdAt: { gte: last24h } } }),
      db.abandonedCart.count({ where: { createdAt: { gte: last7d } } }),
    ])

    const overallConversion = totalViews24h > 0 ? Math.round((totalPurchases24h / totalViews24h) * 10000) / 100 : 0

    return ok({
      bundleSuggestions,
      trendingCategories,
      promoRecommendations,
      inventoryInsights: { overstocked },
      revenueOpportunity: {
        totalViews24h,
        totalPurchases24h,
        overallConversion,
        abandonedCarts7d,
        estimatedLostRevenue: abandonedCarts7d * 1500, // avg cart value estimate
      },
      generatedAt: now.toISOString(),
    })
  } catch (err) {
    console.error('[ml/insights] GET:', err)
    return serverError()
  }
}
