export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { created, badRequest, notFound, unauthorized, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const messageSchema = z.object({
  message: z.string().min(1).max(5000),
})

// POST — customer sends a message in the ticket chat
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const ticket = await db.supportTicket.findFirst({
      where: { id: params.id, userId: user.id },
    })
    if (!ticket) return notFound('Ticket not found')

    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      return badRequest('This ticket is closed. Please create a new ticket.')
    }

    const body = await request.json()
    const parsed = messageSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.issues[0].message)

    const reply = await db.ticketReply.create({
      data: {
        ticketId: params.id,
        message: parsed.data.message,
        isStaff: false,
        authorId: user.id,
      },
    })

    // Update ticket status to OPEN if it was WAITING_CUSTOMER
    if (ticket.status === 'WAITING_CUSTOMER') {
      await db.supportTicket.update({
        where: { id: params.id },
        data: { status: 'OPEN' },
      })
    } else {
      // Touch updatedAt
      await db.supportTicket.update({
        where: { id: params.id },
        data: { updatedAt: new Date() },
      })
    }

    return created({
      id: reply.id,
      message: reply.message,
      isStaff: false,
      createdAt: reply.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('Support message error:', err)
    return serverError()
  }
}
