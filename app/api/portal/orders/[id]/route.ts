export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

// GET — admin get full order details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'orders.view_all')
  if (error) return error

  try {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                media: { where: { isPrimary: true }, take: 1, select: { url: true } },
              },
            },
            variant: { select: { id: true, size: true, color: true, sku: true, inventory: { select: { quantity: true } } } },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            razorpayPaymentId: true,
            method: true,
            status: true,
            amount: true,
            failureReason: true,
            createdAt: true,
          },
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
          select: { status: true, note: true, changedBy: true, createdAt: true },
        },
        address: true,
        coupon: { select: { code: true, discountType: true, discountValue: true } },
        refunds: {
          select: { id: true, amount: true, status: true, reason: true, notes: true, processedAt: true, createdAt: true },
        },
        returnRequests: {
          include: {
            items: {
              include: { orderItem: { select: { product: { select: { name: true } } } } },
            },
          },
        },
      },
    })

    if (!order) return notFound('Order not found')

    // Also fetch any support tickets linked to this order
    const supportTickets = await db.supportTicket.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        _count: { select: { replies: true } },
      },
    })

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
      customer: {
        id: order.user.id,
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone,
        memberSince: order.user.createdAt.toISOString(),
      },
      items: order.items.map(item => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantId: item.variant.id,
        variantInfo: [item.variant.color, item.variant.size].filter(Boolean).join(' / '),
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        discount: Number(item.discount),
        currentStock: item.variant.inventory?.quantity ?? 0,
        image: item.product.media[0]?.url ?? null,
      })),
      payments: order.payments.map(p => ({
        id: p.id,
        razorpayPaymentId: p.razorpayPaymentId,
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
        failureReason: p.failureReason,
        createdAt: p.createdAt.toISOString(),
      })),
      shipments: order.shipments.map(s => ({
        id: s.id,
        carrier: s.carrier,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
        status: s.status,
        estimatedDelivery: s.estimatedDelivery?.toISOString() ?? null,
        deliveredAt: s.deliveredAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      statusHistory: order.statusHistory.map(h => ({
        status: h.status,
        note: h.note,
        changedBy: h.changedBy,
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
        notes: r.notes,
        processedAt: r.processedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      returnRequests: order.returnRequests.map(r => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        items: r.items.map(ri => ({ productName: ri.orderItem.product.name, quantity: ri.quantity })),
        createdAt: r.createdAt.toISOString(),
      })),
      supportTickets: supportTickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        replyCount: t._count.replies,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (err) {
    console.error('Portal order detail error:', err)
    return serverError()
  }
}

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  note: z.string().optional(),
})

// PUT — admin update order status
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'orders.update_status')
  if (error || !employee) return error

  try {
    const body = await request.json()
    const parsed = updateStatusSchema.safeParse(body)
    if (!parsed.success) return badRequest(parsed.error.issues[0].message)

    const order = await db.order.findUnique({ where: { id: params.id } })
    if (!order) return notFound('Order not found')

    const [updatedOrder] = await db.$transaction([
      db.order.update({
        where: { id: params.id },
        data: { status: parsed.data.status },
      }),
      db.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status: parsed.data.status,
          note: parsed.data.note || null,
          changedBy: employee.id,
        },
      }),
    ])

    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'ORDER_STATUS_UPDATE',
      resourceType: 'Order',
      resourceId: params.id,
      payload: { context: { from: order.status, to: parsed.data.status, note: parsed.data.note } },
    })

    return ok({ status: updatedOrder.status })
  } catch (err) {
    console.error('Order status update error:', err)
    return serverError()
  }
}
