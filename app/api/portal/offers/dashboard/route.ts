export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'offers.view')
  if (error) return error

  try {
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)

    const [
      activeCoupons,
      totalCoupons,
      couponRedemptions,
      todayRedemptions,
      activeFlashSales,
      upcomingFlashSales,
      flashSaleStats,
      activeBundles,
      totalBundles,
    ] = await Promise.all([
      db.coupon.count({
        where: {
          isActive: true,
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      }),
      db.coupon.count(),
      db.coupon.aggregate({ _sum: { usedCount: true } }),
      // Approximate today's redemptions from orders with coupons
      db.order.count({
        where: {
          couponId: { not: null },
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      db.flashSale.count({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      db.flashSale.count({
        where: {
          isActive: true,
          startDate: { gt: now },
        },
      }),
      // Flash sale aggregate performance
      db.flashSaleProduct.aggregate({
        where: { flashSale: { isActive: true } },
        _sum: { soldCount: true },
      }),
      db.bundle.count({ where: { isActive: true } }),
      db.bundle.count(),
    ])

    // Top performing coupons
    const topCoupons = await db.coupon.findMany({
      where: { isActive: true, usedCount: { gt: 0 } },
      orderBy: { usedCount: 'desc' },
      take: 5,
      select: {
        id: true, code: true, discountType: true, discountValue: true,
        usedCount: true, maxRedemptions: true,
      },
    })

    // Active flash sales with sell-through
    const liveFlashSales = await db.flashSale.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        products: {
          select: { soldCount: true, stockLimit: true, salePrice: true },
        },
      },
      orderBy: { endDate: 'asc' },
      take: 5,
    })

    const liveFlashSalesSummary = liveFlashSales.map(s => ({
      id: s.id,
      name: s.name,
      endsAt: s.endDate.toISOString(),
      productCount: s.products.length,
      totalSold: s.products.reduce((sum, p) => sum + p.soldCount, 0),
      totalStock: s.products.reduce((sum, p) => sum + (p.stockLimit ?? 0), 0),
      revenue: s.products.reduce((sum, p) => sum + p.soldCount * Number(p.salePrice), 0),
    }))

    return ok({
      summary: {
        activeCoupons,
        totalCoupons,
        totalRedemptions: couponRedemptions._sum.usedCount ?? 0,
        todayRedemptions,
        activeFlashSales,
        upcomingFlashSales,
        flashSaleTotalSold: flashSaleStats._sum.soldCount ?? 0,
        activeBundles,
        totalBundles,
      },
      topCoupons: topCoupons.map(c => ({
        ...c,
        discountValue: Number(c.discountValue),
        usageRate: c.maxRedemptions ? Math.round((c.usedCount / c.maxRedemptions) * 100) : null,
      })),
      liveFlashSales: liveFlashSalesSummary,
    })
  } catch (err) {
    console.error('Offers dashboard error:', err)
    return serverError()
  }
}
