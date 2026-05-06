export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const listQuery = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sort:   z.enum(['newest', 'oldest', 'orders_desc', 'spent_desc']).default('newest'),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'customers.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, search, sort } = listQuery.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.UserWhereInput = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'oldest': return { createdAt: 'asc' as const }
        default:       return { createdAt: 'desc' as const }
      }
    })()

    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true, name: true, email: true, phone: true, isBlocked: true, createdAt: true,
          _count: { select: { orders: true } },
          orders: {
            select: { total: true },
            where: { paymentStatus: 'PAID' },
          },
        },
      }),
      db.user.count({ where }),
    ])

    const items = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      isBlocked: u.isBlocked,
      orderCount: u._count.orders,
      totalSpent: u.orders.reduce((sum, o) => sum + Number(o.total), 0),
      joinedAt: u.createdAt.toISOString(),
    }))

    // Sort by derived fields on the server side
    if (sort === 'orders_desc') items.sort((a, b) => b.orderCount - a.orderCount)
    if (sort === 'spent_desc') items.sort((a, b) => b.totalSpent - a.totalSpent)

    return ok({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
    })
  } catch (err) {
    console.error('Portal customers GET error:', err)
    return serverError()
  }
}
