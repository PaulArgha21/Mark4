export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission, requireCredentialElevation } from '@/lib/permissions'
import { ok, notFound, badRequest, forbidden, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const processSchema = z.object({
  method: z.enum(['ORIGINAL', 'STORE_CREDIT']),
  notes:  z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'refunds.process')
  if (error) return error

  try {
    const refund = await db.refund.findUnique({
      where: { id: params.id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            userId: true,
            payments: { take: 1, select: { razorpayPaymentId: true } },
          },
        },
      },
    })

    if (!refund) return notFound('Refund not found')
    if (refund.status !== 'PENDING') return badRequest(`Refund is already ${refund.status}`)

    // Credential elevation for refunds > 5000
    const amount = Number(refund.amount)
    if (amount > 5000) {
      const elevated = await requireCredentialElevation(employee!.id)
      if (!elevated) {
        return forbidden('Credential elevation required for refunds exceeding ₹5,000')
      }
    }

    const body = await request.json()
    const parsed = processSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const { method, notes } = parsed.data

    if (method === 'ORIGINAL') {
      // In production: call Razorpay refund API
      // const razorpay = new Razorpay({ ... })
      // const rpRefund = await razorpay.payments.refund(paymentId, { amount: amount * 100 })
      // For now, simulate the Razorpay refund ID
      const simulatedRefundId = `rfnd_${nanoid(14)}`

      await db.$transaction([
        db.refund.update({
          where: { id: params.id },
          data: {
            status: 'PROCESSING',
            razorpayRefundId: simulatedRefundId,
            processedById: employee!.id,
            processedAt: new Date(),
            notes: notes ?? null,
          },
        }),
        db.order.update({
          where: { id: refund.orderId },
          data: {
            paymentStatus: Number(refund.amount) >= Number(refund.order.total)
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
          },
        }),
      ])

      logAuditEntry({
        employeeId: employee!.id,
        role: employee!.role,
        action: 'refund.processed',
        resourceType: 'Refund',
        resourceId: params.id,
        payload: {
          after: {
            method: 'ORIGINAL',
            amount: amount.toString(),
            orderNumber: refund.order.orderNumber,
            razorpayRefundId: simulatedRefundId,
          },
        },
      })

      return ok({
        id: refund.id,
        status: 'PROCESSING',
        method: 'ORIGINAL',
        razorpayRefundId: simulatedRefundId,
      })

    } else {
      // STORE_CREDIT: create a gift card
      const giftCardCode = `REF-${nanoid(8).toUpperCase()}`

      const giftCard = await db.$transaction(async (tx) => {
        await tx.refund.update({
          where: { id: params.id },
          data: {
            status: 'COMPLETED',
            processedById: employee!.id,
            processedAt: new Date(),
            notes: notes ?? null,
          },
        })
        const card = await tx.giftCard.create({
          data: {
            code: giftCardCode,
            initialAmount: refund.amount,
            balance: refund.amount,
            purchaserId: refund.order.userId,
            recipientEmail: null,
            message: `Refund for order ${refund.order.orderNumber}`,
          },
        })
        await tx.giftCardTransaction.create({
          data: {
            giftCardId: card.id,
            type: 'REFUND_CREDIT',
            amount: refund.amount,
            orderId: refund.orderId,
          },
        })
        await tx.order.update({
          where: { id: refund.orderId },
          data: {
            paymentStatus: Number(refund.amount) >= Number(refund.order.total)
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
          },
        })
        return card
      })

      logAuditEntry({
        employeeId: employee!.id,
        role: employee!.role,
        action: 'refund.processed_store_credit',
        resourceType: 'Refund',
        resourceId: params.id,
        payload: {
          after: {
            method: 'STORE_CREDIT',
            amount: amount.toString(),
            giftCardCode,
            orderNumber: refund.order.orderNumber,
          },
        },
      })

      return ok({
        id: refund.id,
        status: 'COMPLETED',
        method: 'STORE_CREDIT',
        giftCardCode,
        giftCardBalance: amount,
      })
    }
  } catch (err) {
    console.error('Refund process error:', err)
    return serverError()
  }
}
