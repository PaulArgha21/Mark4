export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const listQuery = z.object({
  page:          z.coerce.number().min(1).default(1),
  limit:         z.coerce.number().min(1).max(100).default(20),
  search:        z.string().optional(),
  status:        z.string().optional(),
  paymentStatus: z.string().optional(),
  sort:          z.enum(['newest', 'oldest', 'total_asc', 'total_desc']).default('newest'),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'orders.view_all')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, search, status, paymentStatus, sort } = listQuery.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.OrderWhereInput = {}
    if (status) where.status = status as never
    if (paymentStatus) where.paymentStatus = paymentStatus as never
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const orderBy: Prisma.OrderOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'oldest':     return { createdAt: 'asc' as const }
        case 'total_asc':  return { total: 'asc' as const }
        case 'total_desc': return { total: 'desc' as const }
        default:           return { createdAt: 'desc' as const }
      }
    })()

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      db.order.count({ where }),
    ])

    const items = orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      itemCount: o._count.items,
      customer: o.user,
      createdAt: o.createdAt.toISOString(),
    }))

    return ok({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Portal orders GET error:', err)
    return serverError()
  }
}
