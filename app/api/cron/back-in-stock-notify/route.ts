export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

// Runs every 30 minutes: check for restocked variants with pending back-in-stock requests
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret')
      ?? request.headers.get('authorization')?.replace('Bearer ', '')
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all pending back-in-stock requests
    const pendingRequests = await db.backInStockRequest.findMany({
      where: { notified: false },
      take: 500,
    })

    if (pendingRequests.length === 0) {
      return NextResponse.json({ status: 'ok', data: { checked: 0, notified: 0 } })
    }

    // Group by variantId
    const byVariant = new Map<string, typeof pendingRequests>()
    for (const req of pendingRequests) {
      const existing = byVariant.get(req.variantId) ?? []
      existing.push(req)
      byVariant.set(req.variantId, existing)
    }

    const variantIds = Array.from(byVariant.keys())

    // Check which variants are now in stock (quantity > 0)
    const inStockVariants = await db.inventory.findMany({
      where: {
        variantId: { in: variantIds },
        quantity: { gt: 0 },
      },
      include: {
        variant: {
          include: { product: { select: { name: true, slug: true } } },
        },
      },
    })

    let totalNotified = 0
    let totalUserNotifications = 0

    for (const inv of inStockVariants) {
      const requests = byVariant.get(inv.variantId) ?? []
      if (requests.length === 0) continue

      const productName = inv.variant.product.name
      const productSlug = inv.variant.product.slug

      // Create in-app notifications for logged-in users
      const userRequests = requests.filter(r => r.userId)
      if (userRequests.length > 0) {
        await db.notification.createMany({
          data: userRequests.map(r => ({
            userId: r.userId!,
            type: 'BACK_IN_STOCK' as const,
            title: 'Back in Stock!',
            message: `${productName} is back in stock. Hurry, limited quantities available!`,
            linkUrl: `/product/${productSlug}`,
          })),
        })
        totalUserNotifications += userRequests.length
      }

      // Mark all as notified
      await db.backInStockRequest.updateMany({
        where: {
          variantId: inv.variantId,
          notified: false,
        },
        data: { notified: true, notifiedAt: new Date() },
      })

      totalNotified += requests.length
    }

    const result = {
      checked: pendingRequests.length,
      restockedVariants: inStockVariants.length,
      notified: totalNotified,
      userNotifications: totalUserNotifications,
      timestamp: new Date().toISOString(),
    }

    console.log('[cron/back-in-stock-notify]', JSON.stringify(result))

    return NextResponse.json({ status: 'ok', data: result })
  } catch (err) {
    console.error('[cron/back-in-stock-notify] Error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
