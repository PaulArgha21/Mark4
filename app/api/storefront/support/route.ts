export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, created, badRequest, unauthorized, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  orderId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
})

// GET — list customer's support tickets
export async function GET(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)))

    const where = {
      userId: user.id,
      ...(status ? { status: status as never } : {}),
    }
    const skip = (page - 1) * limit

    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          replies: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { message: true, isStaff: true, createdAt: true },
          },
          _count: { select: { replies: true } },
        },
      }),
      db.supportTicket.count({ where }),
    ])

    return ok({
      items: tickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        orderId: t.orderId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        replyCount: t._count.replies,
        lastReply: t.replies[0]
          ? {
              message: t.replies[0].message.substring(0, 100),
              isStaff: t.replies[0].isStaff,
              createdAt: t.replies[0].createdAt.toISOString(),
            }
          : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('Support list error:', err)
    return serverError()
  }
}

// POST — create new support ticket
export async function POST(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.issues[0].message)

    const { subject, message, orderId, priority } = parsed.data

    // If orderId provided, verify it belongs to the customer
    if (orderId) {
      const order = await db.order.findFirst({ where: { id: orderId, userId: user.id } })
      if (!order) return badRequest('Order not found')
    }

    const ticket = await db.supportTicket.create({
      data: {
        userId: user.id,
        email: user.email || '',
        subject,
        message,
        orderId: orderId || null,
        priority,
      },
    })

    return created({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('Support create error:', err)
    return serverError()
  }
}
