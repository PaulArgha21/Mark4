export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, notFound, unauthorized, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'

// GET — get ticket detail with all messages (chat view)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const ticket = await db.supportTicket.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            message: true,
            isStaff: true,
            authorId: true,
            createdAt: true,
          },
        },
      },
    })

    if (!ticket) return notFound('Ticket not found')

    return ok({
      id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      priority: ticket.priority,
      orderId: ticket.orderId,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      replies: ticket.replies.map(r => ({
        id: r.id,
        message: r.message,
        isStaff: r.isStaff,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('Support ticket detail error:', err)
    return serverError()
  }
}
