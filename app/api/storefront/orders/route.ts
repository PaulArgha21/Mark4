export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const querySchema = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(50).default(10),
  status: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const { searchParams } = new URL(request.url)
    const { page, limit, status } = querySchema.parse(Object.fromEntries(searchParams))

    const where = {
      userId: user.id,
      ...(status ? { status: status as never } : {}),
    }
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: { select: { name: true, media: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
              variant: { select: { size: true, color: true } },
            },
          },
          shipments: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      db.order.count({ where }),
    ])

    const items = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map(item => ({
        id: item.id,
        productName: item.product.name,
        variantInfo: [item.variant.color, item.variant.size].filter(Boolean).join(' / '),
        quantity: item.quantity,
        price: Number(item.unitPrice),
        image: item.product.media[0]?.url ?? null,
      })),
      shipment: order.shipments[0] ? {
        carrier: order.shipments[0].carrier,
        trackingNumber: order.shipments[0].trackingNumber,
        trackingUrl: order.shipments[0].trackingUrl,
        estimatedDelivery: order.shipments[0].estimatedDelivery?.toISOString() ?? null,
      } : null,
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
    console.error('Orders API error:', err)
    return serverError()
  }
}
