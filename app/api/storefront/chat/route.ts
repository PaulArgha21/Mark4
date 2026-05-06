import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { encryptMessage, decryptMessage } from '@/lib/chat-encryption'
import { processMessage, fetchCustomerOrders } from '@/lib/chat-intent'

// GET /api/storefront/chat — Get or resume active session with history
export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error!

    // Find active session or return empty
    const session = await db.chatSession.findFirst({
      where: { customerId: user.id, status: 'ACTIVE' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!session) {
      return ok({ session: null, messages: [] })
    }

    // Decrypt messages
    const messages = session.messages.map(m => {
      let text = ''
      try {
        text = decryptMessage({ encrypted: m.encrypted, iv: m.iv, tag: m.tag })
      } catch { text = '[Unable to decrypt]' }
      return {
        id: m.id,
        sender: m.sender,
        text,
        intent: m.intent,
        sentiment: m.sentiment,
        metadata: m.metadata,
        createdAt: m.createdAt,
      }
    })

    return ok({
      session: {
        id: session.id,
        status: session.status,
        context: session.context,
        createdAt: session.createdAt,
      },
      messages,
    })
  } catch (err) {
    console.error('Chat GET error:', err)
    return serverError()
  }
}

// POST /api/storefront/chat — Send a message (creates session if needed)
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error!

    const body = await request.json()
    const message = body.message?.trim()
    const action = body.action // 'send' | 'select_order' | 'close' | 'rate'
    const sessionId = body.sessionId
    const orderId = body.orderId

    // ── Close session ──
    if (action === 'close' && sessionId) {
      await db.chatSession.update({
        where: { id: sessionId },
        data: { status: 'CLOSED' },
      })
      return ok({ closed: true })
    }

    // ── Rate session ──
    if (action === 'rate' && sessionId && body.rating) {
      await db.chatSession.update({
        where: { id: sessionId },
        data: { satisfaction: Math.min(5, Math.max(1, Number(body.rating))) },
      })
      return ok({ rated: true })
    }

    if (!message && action !== 'select_order') {
      return badRequest('Message is required')
    }

    // Find or create session
    let session = sessionId
      ? await db.chatSession.findFirst({ where: { id: sessionId, customerId: user.id } })
      : await db.chatSession.findFirst({ where: { customerId: user.id, status: 'ACTIVE' }, orderBy: { updatedAt: 'desc' } })

    if (!session) {
      session = await db.chatSession.create({
        data: { customerId: user.id, context: {} as Prisma.InputJsonValue },
      })
    }

    // Parse session context
    const ctx = (session.context as Record<string, unknown>) || {}
    let selectedOrderId = (ctx.selectedOrderId as string) || undefined

    // ── Order selection action ──
    if (action === 'select_order' && orderId) {
      selectedOrderId = orderId
      await db.chatSession.update({
        where: { id: session.id },
        data: { context: { ...ctx, selectedOrderId: orderId } as Prisma.InputJsonValue },
      })

      // Fetch orders to find the selected one
      const orders = await fetchCustomerOrders(user.id)
      const order = orders.find(o => o.id === orderId)

      if (order) {
        const botMsg = `I've selected Order #${order.orderNumber} for you. What would you like to know about it?`
        const enc = encryptMessage(botMsg)
        await db.chatMessage.create({
          data: {
            sessionId: session.id,
            sender: 'BOT',
            encrypted: enc.encrypted,
            iv: enc.iv,
            tag: enc.tag,
            intent: 'order_select',
            sentiment: 'NEUTRAL',
            metadata: { orderNumber: order.orderNumber, orderId: order.id } as Prisma.InputJsonValue,
          },
        })

        return ok({
          sessionId: session.id,
          botReply: {
            text: botMsg,
            intent: 'order_select',
            sentiment: 'NEUTRAL',
            metadata: { selectedOrderId: orderId, selectedOrderNumber: order.orderNumber },
            showOptions: [
              { label: '📍 Track this order', value: 'track_order' },
              { label: '📦 Order status', value: 'order_status' },
              { label: '🚚 Delivery details', value: 'delivery_time' },
              { label: '❌ Cancel order', value: 'cancel_order' },
              { label: '↩️ Return / Refund', value: 'return_item' },
            ],
          },
        })
      }
    }

    // ── Store customer message (encrypted) ──
    const custEnc = encryptMessage(message)
    await db.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: 'CUSTOMER',
        encrypted: custEnc.encrypted,
        iv: custEnc.iv,
        tag: custEnc.tag,
        sentiment: 'NEUTRAL',
      },
    })

    // ── Process with intent engine ──
    const orders = await fetchCustomerOrders(user.id)
    const result = await processMessage(
      user.id,
      user.name || 'there',
      message,
      { selectedOrderId, orders }
    )

    // Update session context with any new info
    const newCtx = { ...ctx }
    if (result.metadata?.selectedOrderId) {
      newCtx.selectedOrderId = result.metadata.selectedOrderId
    }
    if (result.intent !== 'unknown') {
      const resolved = (newCtx.resolvedIntents as string[]) || []
      if (!resolved.includes(result.intent)) {
        newCtx.resolvedIntents = [...resolved, result.intent]
      }
      newCtx.lastIntent = result.intent
    }

    await db.chatSession.update({
      where: { id: session.id },
      data: {
        context: newCtx as Prisma.InputJsonValue,
        ...(result.needsEscalation ? { status: 'ESCALATED' } : {}),
      },
    })

    // ── Store bot response (encrypted) ──
    const botEnc = encryptMessage(result.response)
    await db.chatMessage.create({
      data: {
        sessionId: session.id,
        sender: 'BOT',
        encrypted: botEnc.encrypted,
        iv: botEnc.iv,
        tag: botEnc.tag,
        intent: result.intent,
        sentiment: result.sentiment,
        confidence: result.confidence,
        metadata: (result.metadata || undefined) as Prisma.InputJsonValue | undefined,
      },
    })

    // ── Self-learn from this interaction ──
    const { learnPattern } = await import('@/lib/chat-intent')
    learnPattern(result.intent, message, result.response, true).catch(() => {})

    return ok({
      sessionId: session.id,
      botReply: {
        text: result.response,
        intent: result.intent,
        sentiment: result.sentiment,
        confidence: result.confidence,
        metadata: result.metadata,
        showOptions: result.showOptions,
        needsEscalation: result.needsEscalation,
        escalationSubject: result.escalationSubject,
      },
    })
  } catch (err) {
    console.error('Chat POST error:', err)
    return serverError()
  }
}
