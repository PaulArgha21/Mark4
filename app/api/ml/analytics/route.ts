export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import { subDays, subHours, startOfDay, format, eachDayOfInterval } from 'date-fns'

const querySchema = z.object({
  days: z.coerce.number().min(1).max(90).default(7),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'analytics.full')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { days } = querySchema.parse(Object.fromEntries(searchParams))

    const now = new Date()
    const since = startOfDay(subDays(now, days - 1))

    // ── Recommendation system health ────────────────────────

    const [
      // Total trending scores computed
      trendingProducts,
      trendingTopScores,
      // Event pipeline health
      totalEvents24h,
      eventsByType24h,
      // Product engagement funnel (last N days)
      viewEvents,
      cartEvents,
      wishlistEvents,
      purchaseEvents,
      // Unique products with any activity
      activeProducts,
    ] = await Promise.all([
      db.trendingScore.count({ where: { score: { gt: 0 } } }),
      db.trendingScore.findMany({
        orderBy: { score: 'desc' },
        take: 10,
        include: {
          product: {
            select: { name: true, slug: true, brand: true },
          },
        },
      }),
      db.userEvent.count({ where: { createdAt: { gte: subHours(now, 24) } } }),
      db.userEvent.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: subHours(now, 24) } },
        _count: true,
      }),
      db.userEvent.count({ where: { eventType: { in: ['page_view', 'product_view'] }, createdAt: { gte: since } } }),
      db.userEvent.count({ where: { eventType: 'add_to_cart', createdAt: { gte: since } } }),
      db.userEvent.count({ where: { eventType: 'add_to_wishlist', createdAt: { gte: since } } }),
      db.userEvent.count({ where: { eventType: 'purchase', createdAt: { gte: since } } }),
      db.userEvent.findMany({
        where: { productId: { not: null }, createdAt: { gte: since } },
        select: { productId: true },
        distinct: ['productId'],
      }),
    ])

    // ── Conversion funnel ───────────────────────────────────

    const viewToCartRate = viewEvents > 0 ? Math.round((cartEvents / viewEvents) * 10000) / 100 : 0
    const cartToPurchaseRate = cartEvents > 0 ? Math.round((purchaseEvents / cartEvents) * 10000) / 100 : 0
    const overallConversionRate = viewEvents > 0 ? Math.round((purchaseEvents / viewEvents) * 10000) / 100 : 0

    // ── Daily event trends ──────────────────────────────────

    const dailyEvents = await db.userEvent.groupBy({
      by: ['eventType'],
      where: { createdAt: { gte: since } },
      _count: true,
    })

    // Events per day for chart
    const allDailyEvents = await db.userEvent.findMany({
      where: { createdAt: { gte: since } },
      select: { eventType: true, createdAt: true },
    })

    const dayBuckets = eachDayOfInterval({ start: since, end: now })
    const dailyTimeSeries = dayBuckets.map(day => {
      const dayStart = startOfDay(day)
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const dayEvents = allDailyEvents.filter(e => e.createdAt >= dayStart && e.createdAt < dayEnd)

      return {
        date: format(day, 'MMM dd'),
        views: dayEvents.filter(e => ['page_view', 'product_view'].includes(e.eventType)).length,
        addToCart: dayEvents.filter(e => e.eventType === 'add_to_cart').length,
        wishlist: dayEvents.filter(e => e.eventType === 'add_to_wishlist').length,
        purchases: dayEvents.filter(e => e.eventType === 'purchase').length,
        total: dayEvents.length,
      }
    })

    // ── Top trending products with engagement data ──────────

    const topTrending = trendingTopScores.map(t => ({
      productId: t.productId,
      name: t.product.name,
      slug: t.product.slug,
      brand: t.product.brand,
      score: Math.round(t.score),
      views24h: t.viewCount24h,
      addToCart24h: t.addToCart24h,
      purchases24h: t.purchase24h,
      wishlist24h: t.wishlist24h,
      conversionRate24h: t.viewCount24h > 0
        ? Math.round((t.purchase24h / t.viewCount24h) * 10000) / 100
        : 0,
    }))

    // ── Event type distribution ─────────────────────────────

    const eventDistribution = eventsByType24h.map(e => ({
      type: e.eventType,
      count: e._count,
    })).sort((a, b) => b.count - a.count)

    return ok({
      health: {
        trendingProductsComputed: trendingProducts,
        totalEvents24h,
        uniqueActiveProducts: activeProducts.length,
        lastComputedAt: trendingTopScores[0]?.computedAt?.toISOString() ?? null,
      },
      funnel: {
        views: viewEvents,
        addToCart: cartEvents,
        wishlist: wishlistEvents,
        purchases: purchaseEvents,
        viewToCartRate,
        cartToPurchaseRate,
        overallConversionRate,
        period: `${days}d`,
      },
      dailyTimeSeries,
      eventDistribution,
      topTrending,
    })
  } catch (err) {
    console.error('ML analytics error:', err)
    return serverError()
  }
}
