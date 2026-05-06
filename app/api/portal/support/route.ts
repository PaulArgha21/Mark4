export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const querySchema = z.object({
  page:     z.coerce.number().min(1).default(1),
  limit:    z.coerce.number().min(1).max(100).default(20),
  status:   z.string().optional(),
  priority: z.string().optional(),
  search:   z.string().optional(),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'support.manage')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, status, priority, search } = querySchema.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.SupportTicketWhereInput = {}
    if (status) where.status = status as never
    if (priority) where.priority = priority
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * limit

    const [tickets, total, statusCounts] = await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          replies: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { message: true, isStaff: true, createdAt: true },
          },
          _count: { select: { replies: true } },
        },
      }),
      db.supportTicket.count({ where }),
      db.supportTicket.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ])

    const summary = {
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_CUSTOMER: 0,
      RESOLVED: 0,
      CLOSED: 0,
    }
    statusCounts.forEach(s => {
      summary[s.status as keyof typeof summary] = s._count._all
    })

    return ok({
      items: tickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        email: t.email,
        orderId: t.orderId,
        assignedTo: t.assignedTo,
        customerName: t.user?.name || t.email,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        replyCount: t._count.replies,
        lastReply: t.replies[0]
          ? {
              message: t.replies[0].message.substring(0, 120),
              isStaff: t.replies[0].isStaff,
              createdAt: t.replies[0].createdAt.toISOString(),
            }
          : null,
      })),
      summary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('Portal support list error:', err)
    return serverError()
  }
}
