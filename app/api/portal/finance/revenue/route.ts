export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, subDays, subMonths, subYears, eachDayOfInterval, eachWeekOfInterval,
  eachMonthOfInterval, format,
} from 'date-fns'

const querySchema = z.object({
  period:     z.enum(['7d', '30d', '90d', '12m', 'ytd', 'custom']).default('30d'),
  startDate:  z.string().datetime().optional(),
  endDate:    z.string().datetime().optional(),
  granularity:z.enum(['daily', 'weekly', 'monthly']).default('daily'),
  compare:    z.enum(['previous_period', 'previous_year', 'none']).default('previous_period'),
})

function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date()
  let start: Date, end: Date

  switch (period) {
    case '7d':     start = startOfDay(subDays(now, 6));  end = endOfDay(now); break
    case '30d':    start = startOfDay(subDays(now, 29)); end = endOfDay(now); break
    case '90d':    start = startOfDay(subDays(now, 89)); end = endOfDay(now); break
    case '12m':    start = startOfMonth(subMonths(now, 11)); end = endOfDay(now); break
    case 'ytd':    start = startOfYear(now);             end = endOfDay(now); break
    case 'custom':
      start = startDate ? startOfDay(new Date(startDate)) : startOfDay(subDays(now, 29))
      end = endDate ? endOfDay(new Date(endDate)) : endOfDay(now)
      break
    default: start = startOfDay(subDays(now, 29)); end = endOfDay(now)
  }
  return { start, end }
}

function getComparisonRange(start: Date, end: Date, compare: string) {
  const diff = end.getTime() - start.getTime()
  if (compare === 'previous_year') {
    return { start: subYears(start, 1), end: subYears(end, 1) }
  }
  // previous_period
  return { start: new Date(start.getTime() - diff), end: new Date(start.getTime() - 1) }
}

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'analytics.full')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { period, startDate, endDate, granularity, compare } = querySchema.parse(
      Object.fromEntries(searchParams)
    )

    const { start, end } = getDateRange(period, startDate, endDate)
    const comp = compare !== 'none' ? getComparisonRange(start, end, compare) : null

    // ── Parallel aggregate queries ──────────────────────────

    const baseWhere = { status: 'PAID' as const, createdAt: { gte: start, lte: end } }
    const compWhere = comp ? { status: 'PAID' as const, createdAt: { gte: comp.start, lte: comp.end } } : null

    const [
      // Current period totals
      revenueAgg,
      orderCount,
      // Comparison period totals
      compRevenueAgg,
      compOrderCount,
      // Revenue by day/week/month (raw orders grouped)
      ordersByPeriod,
      // Revenue by category
      categoryRevenue,
      // Revenue by payment method
      methodRevenue,
      // Refunds in period
      refundsAgg,
      // Top products
      topProducts,
    ] = await Promise.all([
      // Total paid revenue
      db.payment.aggregate({
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
      }),
      db.order.count({ where: { createdAt: { gte: start, lte: end } } }),

      // Comparison
      compWhere
        ? db.payment.aggregate({ where: compWhere, _sum: { amount: true }, _count: true })
        : Promise.resolve(null),
      compWhere
        ? db.order.count({ where: { createdAt: { gte: comp!.start, lte: comp!.end } } })
        : Promise.resolve(0),

      // Orders with date for time series
      db.order.findMany({
        where: { createdAt: { gte: start, lte: end }, paymentStatus: 'PAID' },
        select: { total: true, createdAt: true, _count: { select: { items: true } } },
        orderBy: { createdAt: 'asc' },
      }),

      // Category revenue: join orderItems → product → category
      db.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } },
        },
        _sum: { totalPrice: true },
        _count: true,
      }),

      // Payment method split
      db.payment.groupBy({
        by: ['method'],
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
      }),

      // Refunds
      db.refund.aggregate({
        where: { createdAt: { gte: start, lte: end }, status: { in: ['COMPLETED', 'PROCESSING'] } },
        _sum: { amount: true },
        _count: true,
      }),

      // Top 10 products by revenue
      db.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } },
        },
        _sum: { totalPrice: true, quantity: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: 10,
      }),
    ])

    // ── Build time series ───────────────────────────────────

    const buckets: { label: string; start: Date; end: Date }[] = []
    if (granularity === 'daily') {
      for (const d of eachDayOfInterval({ start, end })) {
        buckets.push({ label: format(d, 'MMM dd'), start: startOfDay(d), end: endOfDay(d) })
      }
    } else if (granularity === 'weekly') {
      for (const w of eachWeekOfInterval({ start, end })) {
        buckets.push({ label: format(w, 'MMM dd'), start: startOfWeek(w), end: endOfWeek(w) })
      }
    } else {
      for (const m of eachMonthOfInterval({ start, end })) {
        buckets.push({ label: format(m, 'MMM yyyy'), start: startOfMonth(m), end: endOfMonth(m) })
      }
    }

    const timeSeries = buckets.map(b => {
      const ordersInBucket = ordersByPeriod.filter(
        o => o.createdAt >= b.start && o.createdAt <= b.end
      )
      const revenue = ordersInBucket.reduce((s, o) => s + Number(o.total), 0)
      const count = ordersInBucket.length
      return {
        label: b.label,
        revenue: Math.round(revenue * 100) / 100,
        orders: count,
        aov: count > 0 ? Math.round((revenue / count) * 100) / 100 : 0,
      }
    })

    // ── Fetch product names for top products + category data ─

    const allProductIds = Array.from(new Set([
      ...topProducts.map(t => t.productId),
      ...categoryRevenue.map(c => c.productId),
    ]))

    const productDetails = allProductIds.length > 0
      ? await db.product.findMany({
          where: { id: { in: allProductIds } },
          select: { id: true, name: true, slug: true, categoryId: true, category: { select: { name: true } } },
        })
      : []
    const productMap = new Map(productDetails.map(p => [p.id, p]))

    // ── Category breakdown ──────────────────────────────────

    const categoryMap = new Map<string, { name: string; revenue: number; orders: number }>()
    for (const item of categoryRevenue) {
      const prod = productMap.get(item.productId)
      const catName = prod?.category?.name ?? 'Uncategorized'
      const existing = categoryMap.get(catName) ?? { name: catName, revenue: 0, orders: 0 }
      existing.revenue += Number(item._sum.totalPrice ?? 0)
      existing.orders += item._count
      categoryMap.set(catName, existing)
    }
    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue)

    // ── Payment method breakdown ────────────────────────────

    const paymentMethodBreakdown = methodRevenue.map(m => ({
      method: m.method ?? 'UNKNOWN',
      revenue: Number(m._sum.amount ?? 0),
      count: m._count,
    })).sort((a, b) => b.revenue - a.revenue)

    // ── Top products ────────────────────────────────────────

    const topProductsList = topProducts.map(t => {
      const prod = productMap.get(t.productId)
      return {
        productId: t.productId,
        name: prod?.name ?? 'Unknown',
        slug: prod?.slug ?? '',
        revenue: Number(t._sum.totalPrice ?? 0),
        unitsSold: Number(t._sum.quantity ?? 0),
      }
    })

    // ── Summary metrics ─────────────────────────────────────

    const currentRevenue = Number(revenueAgg._sum.amount ?? 0)
    const currentTransactions = revenueAgg._count
    const currentAOV = orderCount > 0 ? currentRevenue / orderCount : 0
    const refundTotal = Number(refundsAgg._sum.amount ?? 0)
    const netRevenue = currentRevenue - refundTotal

    const prevRevenue = compRevenueAgg ? Number(compRevenueAgg._sum.amount ?? 0) : null
    const prevOrders = compOrderCount || null
    const revenueGrowth = prevRevenue && prevRevenue > 0
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : null
    const orderGrowth = prevOrders && prevOrders > 0
      ? ((orderCount - prevOrders) / prevOrders) * 100 : null

    return ok({
      summary: {
        revenue: Math.round(currentRevenue * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        refunds: Math.round(refundTotal * 100) / 100,
        refundCount: refundsAgg._count,
        orders: orderCount,
        transactions: currentTransactions,
        aov: Math.round(currentAOV * 100) / 100,
        revenueGrowth: revenueGrowth !== null ? Math.round(revenueGrowth * 10) / 10 : null,
        orderGrowth: orderGrowth !== null ? Math.round(orderGrowth * 10) / 10 : null,
      },
      timeSeries,
      categoryBreakdown,
      paymentMethodBreakdown,
      topProducts: topProductsList,
      period: { start: start.toISOString(), end: end.toISOString(), granularity, compare },
    })
  } catch (err) {
    console.error('Revenue analytics error:', err)
    return serverError()
  }
}
