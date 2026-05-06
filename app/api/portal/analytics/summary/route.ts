export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { startOfMonth, startOfDay, subMonths, subDays } from 'date-fns'

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'analytics.full')
  if (error) return error

  try {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const prevMonthStart = startOfMonth(subMonths(now, 1))
    const dayStart = startOfDay(now)
    const prevDayStart = startOfDay(subDays(now, 1))

    const [
      revenueMTD,
      revenuePrevMonth,
      ordersToday,
      ordersYesterday,
      pendingOrders,
      totalUsers,
      usersPrevMonth,
      lowStockCount,
      activeFlashSales,
      totalOrdersMTD,
      totalOrdersPrevMTD,
      totalRevenueMTDOrders,
      recentOrders,
      totalPageViews,
    ] = await Promise.all([
      db.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      db.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: prevMonthStart, lt: monthStart } },
        _sum: { amount: true },
      }),
      db.order.count({ where: { createdAt: { gte: dayStart } } }),
      db.order.count({ where: { createdAt: { gte: prevDayStart, lt: dayStart } } }),
      db.order.count({ where: { status: 'PENDING' } }),
      db.user.count(),
      db.user.count({ where: { createdAt: { lt: monthStart } } }),
      db.inventory.count({ where: { quantity: { lte: 5, gt: 0 } } }),
      db.flashSale.count({
        where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      }),
      db.order.count({ where: { createdAt: { gte: monthStart } } }),
      db.order.count({ where: { createdAt: { gte: prevMonthStart, lt: monthStart } } }),
      db.order.aggregate({
        where: { createdAt: { gte: monthStart } },
        _avg: { total: true },
        _count: true,
      }),
      db.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNumber: true, status: true, total: true, createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      db.analyticsEvent.count({
        where: { eventName: 'page_view', createdAt: { gte: monthStart } },
      }).catch(() => 0),
    ])

    const revMTD = Number(revenueMTD._sum.amount ?? 0)
    const revPrev = Number(revenuePrevMonth._sum.amount ?? 0)
    const avgOrderValue = Number(totalRevenueMTDOrders._avg.total ?? 0)
    const totalOrdersCount = totalRevenueMTDOrders._count ?? 0

    // Conversion rate: orders / page views (if available)
    const conversionRate = totalPageViews > 0
      ? Math.round((totalOrdersMTD / totalPageViews) * 10000) / 100
      : 0

    // Trend calculations (% change)
    const calcTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0
      return Math.round(((current - prev) / prev) * 1000) / 10
    }

    return ok({
      revenueMTD: revMTD,
      ordersToday,
      pendingOrders,
      totalUsers,
      lowStockCount,
      activeFlashSales,
      conversionRate,
      avgOrderValue: Math.round(avgOrderValue),
      totalOrdersMTD: totalOrdersCount,
      trends: {
        revenue: calcTrend(revMTD, revPrev),
        orders: calcTrend(ordersToday, ordersYesterday),
        users: calcTrend(totalUsers, usersPrevMonth),
        aov: 0,
      },
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer: o.user?.name ?? o.user?.email ?? 'Guest',
        status: o.status,
        amount: Number(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('Analytics summary error:', err)
    return serverError()
  }
}
