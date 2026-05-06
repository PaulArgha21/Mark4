export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, notFound, unauthorized, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const order = await db.order.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                media: { where: { isPrimary: true }, take: 1, select: { url: true } },
              },
            },
            variant: { select: { size: true, color: true, sku: true } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { method: true, status: true, amount: true, createdAt: true },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            carrier: true,
            trackingNumber: true,
            trackingUrl: true,
            status: true,
            estimatedDelivery: true,
            deliveredAt: true,
            createdAt: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          select: { status: true, note: true, createdAt: true },
        },
        address: true,
        coupon: { select: { code: true, discountType: true, discountValue: true } },
        refunds: {
          select: { id: true, amount: true, status: true, reason: true, createdAt: true },
        },
        returnRequests: {
          select: { id: true, reason: true, status: true, createdAt: true },
        },
      },
    })

    if (!order) return notFound('Order not found')

    return ok({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      total: Number(order.total),
      notes: order.notes,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map(item => ({
        id: item.id,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantInfo: [item.variant.color, item.variant.size].filter(Boolean).join(' / '),
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        discount: Number(item.discount),
        image: item.product.media[0]?.url ?? null,
      })),
      payment: order.payments[0]
        ? {
            method: order.payments[0].method,
            status: order.payments[0].status,
            amount: Number(order.payments[0].amount),
            paidAt: order.payments[0].createdAt.toISOString(),
          }
        : null,
      shipments: order.shipments.map(s => ({
        id: s.id,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
        status: s.status,
        estimatedDelivery: s.estimatedDelivery?.toISOString() ?? null,
        deliveredAt: s.deliveredAt?.toISOString() ?? null,
      })),
      statusHistory: order.statusHistory.map(h => ({
        status: h.status,
        note: h.note,
        createdAt: h.createdAt.toISOString(),
      })),
      coupon: order.coupon
        ? { code: order.coupon.code, discountType: order.coupon.discountType, discountValue: Number(order.coupon.discountValue) }
        : null,
      refunds: order.refunds.map(r => ({
        id: r.id,
        amount: Number(r.amount),
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
      returnRequests: order.returnRequests.map(r => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('Order detail API error:', err)
    return serverError()
  }
}
