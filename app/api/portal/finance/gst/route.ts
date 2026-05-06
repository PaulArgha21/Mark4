export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns'

const querySchema = z.object({
  months: z.coerce.number().min(1).max(24).default(6),
})

// India GST: 18% standard rate
// Split: 9% CGST + 9% SGST (intra-state) or 18% IGST (inter-state)
// For simplicity, we compute total GST from order.tax and split 50/50 CGST/SGST
// In production, use shipping address state vs business state for IGST detection

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'analytics.full')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { months } = querySchema.parse(Object.fromEntries(searchParams))

    const now = new Date()
    const start = startOfMonth(subMonths(now, months - 1))
    const end = endOfMonth(now)

    // Get all paid orders in range with tax data
    const orders = await db.order.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: { gte: start, lte: end },
      },
      select: {
        tax: true,
        subtotal: true,
        total: true,
        shippingCost: true,
        createdAt: true,
        shippingAddress: true,
      },
    })

    // Monthly GST breakdown
    const monthBuckets = eachMonthOfInterval({ start, end })
    const monthlyGST = monthBuckets.map(m => {
      const mStart = startOfMonth(m)
      const mEnd = endOfMonth(m)
      const monthOrders = orders.filter(
        o => o.createdAt >= mStart && o.createdAt <= mEnd
      )

      const totalTax = monthOrders.reduce((s, o) => s + Number(o.tax), 0)
      const totalRevenue = monthOrders.reduce((s, o) => s + Number(o.total), 0)
      const taxableValue = monthOrders.reduce((s, o) => s + Number(o.subtotal), 0)

      // Detect inter-state (simplified: check if shippingAddress has different state)
      let igstOrders = 0
      let cgstSgstOrders = 0
      for (const o of monthOrders) {
        const addr = o.shippingAddress as Record<string, unknown> | null
        const state = addr?.state as string | undefined
        // Business state: Maharashtra (hardcoded for now, should be from site settings)
        if (state && state.toLowerCase() !== 'maharashtra') {
          igstOrders++
        } else {
          cgstSgstOrders++
        }
      }

      const igstRatio = monthOrders.length > 0 ? igstOrders / monthOrders.length : 0
      const igst = Math.round(totalTax * igstRatio * 100) / 100
      const cgst = Math.round(((totalTax - igst) / 2) * 100) / 100
      const sgst = Math.round(((totalTax - igst) / 2) * 100) / 100

      return {
        month: format(m, 'MMM yyyy'),
        monthKey: format(m, 'yyyy-MM'),
        orderCount: monthOrders.length,
        taxableValue: Math.round(taxableValue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalGST: Math.round(totalTax * 100) / 100,
        cgst,
        sgst,
        igst,
        effectiveRate: taxableValue > 0 ? Math.round((totalTax / taxableValue) * 10000) / 100 : 0,
      }
    })

    // Summary totals
    const totalGST = monthlyGST.reduce((s, m) => s + m.totalGST, 0)
    const totalCGST = monthlyGST.reduce((s, m) => s + m.cgst, 0)
    const totalSGST = monthlyGST.reduce((s, m) => s + m.sgst, 0)
    const totalIGST = monthlyGST.reduce((s, m) => s + m.igst, 0)
    const totalTaxableValue = monthlyGST.reduce((s, m) => s + m.taxableValue, 0)
    const totalOrders = monthlyGST.reduce((s, m) => s + m.orderCount, 0)

    // GST slab breakdown (simplified: group by rate)
    // Standard: 18%, 12%, 5%, 0% — we assume 18% for all (clothing/accessories)
    const slabBreakdown = [
      { rate: 18, taxableValue: totalTaxableValue, gst: totalGST, orders: totalOrders },
    ]

    return ok({
      summary: {
        totalGST: Math.round(totalGST * 100) / 100,
        cgst: Math.round(totalCGST * 100) / 100,
        sgst: Math.round(totalSGST * 100) / 100,
        igst: Math.round(totalIGST * 100) / 100,
        taxableValue: Math.round(totalTaxableValue * 100) / 100,
        totalOrders,
        averageGSTPerOrder: totalOrders > 0 ? Math.round((totalGST / totalOrders) * 100) / 100 : 0,
      },
      monthly: monthlyGST,
      slabBreakdown,
      period: { start: start.toISOString(), end: end.toISOString(), months },
    })
  } catch (err) {
    console.error('GST report error:', err)
    return serverError()
  }
}
