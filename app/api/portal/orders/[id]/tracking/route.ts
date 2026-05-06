export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

const trackingSchema = z.object({
  carrier:           z.string().min(1),
  trackingNumber:    z.string().min(1),
  trackingUrl:       z.string().url().optional(),
  estimatedDelivery: z.string().datetime().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'orders.update_status')
  if (error) return error

  try {
    const order = await db.order.findUnique({ where: { id: params.id } })
    if (!order) return notFound('Order not found')

    const body = await request.json()
    const parsed = trackingSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid tracking data', parsed.error.flatten())

    const { carrier, trackingNumber, trackingUrl, estimatedDelivery } = parsed.data

    // Create shipment + update order status + history in transaction
    const [shipment] = await db.$transaction([
      db.shipment.create({
        data: {
          orderId: params.id,
          carrier,
          trackingNumber,
          trackingUrl,
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        },
      }),
      db.order.update({
        where: { id: params.id },
        data: { status: 'SHIPPED' },
      }),
      db.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status: 'SHIPPED',
          note: `Shipped via ${carrier} — ${trackingNumber}`,
          changedBy: employee!.id,
        },
      }),
    ])

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'order.tracking_added',
      resourceType: 'Order',
      resourceId: params.id,
      payload: { after: { carrier, trackingNumber } },
    })

    return ok({
      id: shipment.id,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
    })
  } catch (err) {
    console.error('Order tracking error:', err)
    return serverError()
  }
}
