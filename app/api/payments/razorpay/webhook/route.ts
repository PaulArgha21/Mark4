export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { PaymentMethod } from '@prisma/client'

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature') ?? ''

    // HMAC verification
    if (!verifySignature(rawBody, signature)) {
      console.warn('[razorpay/webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const payload = JSON.parse(rawBody)
    const eventType = payload.event as string
    const eventId = payload.payload?.payment?.entity?.id ?? payload.payload?.refund?.entity?.id ?? crypto.randomUUID()

    // Idempotency — check if we already processed this event
    const existing = await db.webhookEvent.findFirst({
      where: { source: 'razorpay', eventType, payload: { path: ['payload', 'payment', 'entity', 'id'], equals: eventId } },
    })

    if (existing?.processed) {
      return NextResponse.json({ status: 'already_processed' }, { status: 200 })
    }

    // Store webhook event
    const webhookEvent = await db.webhookEvent.create({
      data: {
        source: 'razorpay',
        eventType,
        payload: payload as object,
      },
    })

    // Process based on event type
    try {
      switch (eventType) {
        case 'payment.captured': {
          const paymentEntity = payload.payload?.payment?.entity
          if (paymentEntity?.order_id) {
            // Find order by razorpay order ID and mark payment as captured
            const payment = await db.payment.findFirst({
              where: { razorpayOrderId: paymentEntity.order_id },
            })
            if (payment) {
              await db.$transaction([
                db.payment.update({
                  where: { id: payment.id },
                  data: {
                    status: 'PAID',
                    razorpayPaymentId: paymentEntity.id,
                    method: mapPaymentMethod(paymentEntity.method),
                  },
                }),
                db.order.update({
                  where: { id: payment.orderId },
                  data: { paymentStatus: 'PAID' },
                }),
                db.orderStatusHistory.create({
                  data: {
                    orderId: payment.orderId,
                    status: 'CONFIRMED',
                    note: `Payment captured via Razorpay webhook: ${paymentEntity.id}`,
                    changedBy: 'SYSTEM',
                  },
                }),
              ])
            }
          }
          break
        }

        case 'payment.failed': {
          const failedEntity = payload.payload?.payment?.entity
          if (failedEntity?.order_id) {
            const payment = await db.payment.findFirst({
              where: { razorpayOrderId: failedEntity.order_id },
            })
            if (payment) {
              await db.$transaction([
                db.payment.update({
                  where: { id: payment.id },
                  data: { status: 'FAILED' },
                }),
                db.order.update({
                  where: { id: payment.orderId },
                  data: { paymentStatus: 'FAILED' },
                }),
              ])
            }
          }
          break
        }

        case 'refund.processed': {
          const refundEntity = payload.payload?.refund?.entity
          if (refundEntity?.id) {
            const refund = await db.refund.findFirst({
              where: { razorpayRefundId: refundEntity.id },
            })
            if (refund) {
              await db.refund.update({
                where: { id: refund.id },
                data: { status: 'COMPLETED', processedAt: new Date() },
              })
            }
          }
          break
        }

        case 'refund.failed': {
          const failedRefund = payload.payload?.refund?.entity
          if (failedRefund?.id) {
            await db.refund.updateMany({
              where: { razorpayRefundId: failedRefund.id },
              data: { status: 'FAILED' },
            })
          }
          break
        }
      }

      // Mark webhook event as processed
      await db.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processed: true, processedAt: new Date() },
      })
    } catch (processError) {
      // Log processing error but don't fail the webhook response
      const errorMsg = processError instanceof Error ? processError.message : 'Unknown error'
      await db.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { error: errorMsg },
      }).catch(() => {})
      console.error('[razorpay/webhook] Processing error:', processError)
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (err) {
    console.error('[razorpay/webhook] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function mapPaymentMethod(method: string): PaymentMethod | undefined {
  const map: Record<string, PaymentMethod> = {
    card: 'CARD', upi: 'UPI', netbanking: 'NETBANKING', wallet: 'WALLET',
  }
  return map[method]
}
