export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { ok, badRequest, serverError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const { error, employee } = await requirePermission(request, 'inventory.update')
    if (error || !employee) return error!

    const body = await request.json()
    const { variantId } = body as { variantId?: string }

    if (!variantId) return badRequest('variantId required')

    // Find pending requests for this variant
    const requests = await db.backInStockRequest.findMany({
      where: { variantId, notified: false },
    })

    if (requests.length === 0) {
      return ok({ notified: 0, message: 'No pending requests for this variant' })
    }

    // Get variant + product info for notification
    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { name: true, slug: true } } },
    })

    const productName = variant?.product?.name ?? 'Product'
    const productSlug = variant?.product?.slug ?? ''

    // Create notifications for users who have accounts
    const userRequests = requests.filter(r => r.userId)
    if (userRequests.length > 0) {
      await db.notification.createMany({
        data: userRequests.map(r => ({
          userId: r.userId!,
          type: 'BACK_IN_STOCK' as const,
          title: 'Back in Stock!',
          message: `${productName} is back in stock. Grab it before it sells out!`,
          linkUrl: productSlug ? `/product/${productSlug}` : undefined,
        })),
      })
    }

    // Mark all requests as notified
    await db.backInStockRequest.updateMany({
      where: { variantId, notified: false },
      data: { notified: true, notifiedAt: new Date() },
    })

    // Audit
    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'back_in_stock.notified',
      resourceType: 'BackInStockRequest',
      resourceId: variantId,
      payload: { context: { variantId, count: requests.length, userNotifications: userRequests.length } },
    })

    return ok({
      notified: requests.length,
      userNotifications: userRequests.length,
      emailNotifications: requests.length - userRequests.length,
      message: `Notified ${requests.length} subscribers`,
    })
  } catch (err) {
    console.error('[portal/back-in-stock/notify] Error:', err)
    return serverError('Failed to send notifications')
  }
}
