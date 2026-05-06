export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

// GET — admin get ticket detail with all messages
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'support.manage')
  if (error) return error

  try {
    const ticket = await db.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
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

    // If linked to an order, fetch order summary
    let orderSummary = null
    if (ticket.orderId) {
      const order = await db.order.findUnique({
        where: { id: ticket.orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      })
      if (order) {
        orderSummary = {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: Number(order.total),
          createdAt: order.createdAt.toISOString(),
        }
      }
    }

    return ok({
      id: ticket.id,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      priority: ticket.priority,
      orderId: ticket.orderId,
      assignedTo: ticket.assignedTo,
      customer: ticket.user
        ? { id: ticket.user.id, name: ticket.user.name, email: ticket.user.email, phone: ticket.user.phone }
        : { id: null, name: null, email: ticket.email, phone: null },
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      order: orderSummary,
      replies: ticket.replies.map(r => ({
        id: r.id,
        message: r.message,
        isStaff: r.isStaff,
        authorId: r.authorId,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('Portal ticket detail error:', err)
    return serverError()
  }
}

const replySchema = z.object({
  message: z.string().min(1).max(5000),
})

// POST — admin reply to ticket
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'support.manage')
  if (error || !employee) return error

  try {
    const ticket = await db.supportTicket.findUnique({ where: { id: params.id } })
    if (!ticket) return notFound('Ticket not found')

    const body = await request.json()
    const parsed = replySchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.issues[0].message)

    const reply = await db.ticketReply.create({
      data: {
        ticketId: params.id,
        message: parsed.data.message,
        isStaff: true,
        authorId: employee.id,
      },
    })

    // Update ticket status to WAITING_CUSTOMER
    await db.supportTicket.update({
      where: { id: params.id },
      data: {
        status: 'WAITING_CUSTOMER',
        assignedTo: employee.id,
      },
    })

    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'SUPPORT_REPLY',
      resourceType: 'SupportTicket',
      resourceId: params.id,
      payload: { context: { messageLength: parsed.data.message.length } },
    })

    return ok({
      id: reply.id,
      message: reply.message,
      isStaff: true,
      createdAt: reply.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('Portal ticket reply error:', err)
    return serverError()
  }
}

const statusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']),
})

// PUT — admin update ticket status
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'support.manage')
  if (error || !employee) return error

  try {
    const ticket = await db.supportTicket.findUnique({ where: { id: params.id } })
    if (!ticket) return notFound('Ticket not found')

    const body = await request.json()
    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.issues[0].message)

    await db.supportTicket.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    })

    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'SUPPORT_STATUS_UPDATE',
      resourceType: 'SupportTicket',
      resourceId: params.id,
      payload: { context: { from: ticket.status, to: parsed.data.status } },
    })

    return ok({ status: parsed.data.status })
  } catch (err) {
    console.error('Portal ticket status update error:', err)
    return serverError()
  }
}
