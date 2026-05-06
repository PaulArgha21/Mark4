export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET ?? ''
const ABANDON_THRESHOLD_HOURS = 1
const MAX_PROCESS = 100

// Hourly cron: detect carts idle for > 1 hour, create AbandonedCart records, send notifications
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret')
      ?? request.headers.get('authorization')?.replace('Bearer ', '')
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - ABANDON_THRESHOLD_HOURS)

    // Find carts updated more than threshold hours ago with items
    const staleCarts = await db.cart.findMany({
      where: {
        updatedAt: { lt: cutoff },
        items: { some: {} },
      },
      include: {
        items: {
          include: {
            variant: { include: { product: { select: { name: true, basePrice: true } } } },
          },
        },
        user: { select: { id: true, email: true, name: true } },
      },
      take: MAX_PROCESS,
    })

    let created = 0
    let notified = 0

    for (const cart of staleCarts) {
      // Calculate cart value
      const totalValue = cart.items.reduce((sum: number, item) => {
        const price = Number(item.variant.product.basePrice) + Number(item.variant.priceDelta)
        return sum + price * item.quantity
      }, 0)

      // Only track carts worth > ₹500
      if (totalValue < 500) continue

      const email = cart.user?.email ?? null
      const userId = cart.userId ?? null

      // Check if we already have an unrecovered abandoned cart for this user/session
      const existing = await db.abandonedCart.findFirst({
        where: {
          ...(userId ? { userId } : { sessionId: cart.sessionId }),
          recoveredAt: null,
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // within last 24h
        },
      })

      if (existing) continue // Don't duplicate within 24h

      // Create abandoned cart record
      await db.abandonedCart.create({
        data: {
          userId,
          sessionId: cart.sessionId,
          email,
          cartData: {
            items: cart.items.map(i => ({
              variantId: i.variantId,
              productName: i.variant.product.name,
              quantity: i.quantity,
              price: Number(i.variant.product.basePrice) + Number(i.variant.priceDelta),
            })),
          },
          totalValue,
        },
      })
      created++

      // Create notification for logged-in users
      if (userId) {
        await db.notification.create({
          data: {
            userId,
            type: 'PROMOTION',
            title: 'You left something behind!',
            message: `Your cart with ${cart.items.length} item(s) worth ₹${totalValue.toLocaleString()} is waiting for you.`,
            linkUrl: '/cart',
          },
        })
        notified++
      }
    }

    const result = {
      processed: staleCarts.length,
      abandoned: created,
      notified,
      timestamp: new Date().toISOString(),
    }

    console.log('[cron/abandoned-cart]', JSON.stringify(result))

    return NextResponse.json({ status: 'ok', data: result })
  } catch (err) {
    console.error('[cron/abandoned-cart] Error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
