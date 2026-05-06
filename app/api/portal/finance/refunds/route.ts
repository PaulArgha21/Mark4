export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const querySchema = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'all']).default('all'),
  search: z.string().optional(),
  sort:   z.enum(['newest', 'oldest', 'amount_asc', 'amount_desc']).default('newest'),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'refunds.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, status, search, sort } = querySchema.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.RefundWhereInput = {}
    if (status !== 'all') where.status = status as never
    if (search) {
      where.OR = [
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { order: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    const orderBy: Prisma.RefundOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'oldest':     return { createdAt: 'asc' as const }
        case 'amount_asc': return { amount: 'asc' as const }
        case 'amount_desc':return { amount: 'desc' as const }
        default:           return { createdAt: 'desc' as const }
      }
    })()

    const skip = (page - 1) * limit

    const [refunds, total, statusCounts] = await Promise.all([
      db.refund.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              paymentStatus: true,
              user: { select: { id: true, name: true, email: true } },
              payments: { take: 1, select: { razorpayPaymentId: true, method: true } },
            },
          },
        },
      }),
      db.refund.count({ where }),
      // Aggregate counts by status for dashboard filters
      db.refund.groupBy({
        by: ['status'],
        _count: true,
        _sum: { amount: true },
      }),
    ])

    const items = refunds.map(r => ({
      id: r.id,
      orderId: r.orderId,
      orderNumber: r.order.orderNumber,
      customer: r.order.user,
      amount: Number(r.amount),
      orderTotal: Number(r.order.total),
      reason: r.reason,
      status: r.status,
      razorpayRefundId: r.razorpayRefundId,
      paymentMethod: r.order.payments[0]?.method ?? null,
      razorpayPaymentId: r.order.payments[0]?.razorpayPaymentId ?? null,
      processedById: r.processedById,
      processedAt: r.processedAt?.toISOString() ?? null,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }))

    const statusSummary = statusCounts.map(s => ({
      status: s.status,
      count: s._count,
      totalAmount: Number(s._sum.amount ?? 0),
    }))

    return ok({
      items,
      statusSummary,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Refunds list error:', err)
    return serverError()
  }
}
