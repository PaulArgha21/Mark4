export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED', 'CANCELLED'],
  DELIVERED:  ['RETURNED'],
}

const updateSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note:   z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'orders.update_status')
  if (error) return error

  try {
    const order = await db.order.findUnique({ where: { id: params.id } })
    if (!order) return notFound('Order not found')

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const { status, note } = parsed.data

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.status] ?? []
    if (!allowed.includes(status)) {
      return badRequest(`Cannot transition from ${order.status} to ${status}`)
    }

    // Update order + create history entry
    const [updated] = await db.$transaction([
      db.order.update({
        where: { id: params.id },
        data: { status },
      }),
      db.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status,
          note,
          changedBy: employee!.id,
        },
      }),
    ])

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'order.status_updated',
      resourceType: 'Order',
      resourceId: params.id,
      payload: {
        before: { status: order.status },
        after: { status: updated.status },
        context: { note },
      },
    })

    return ok({ id: updated.id, status: updated.status })
  } catch (err) {
    console.error('Order status update error:', err)
    return serverError()
  }
}
