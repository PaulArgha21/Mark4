export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { ok, badRequest, serverError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error!

    const sp = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20')))
    const unreadOnly = sp.get('unread') === 'true'

    const where = {
      userId: user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    }

    const [items, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          linkUrl: true,
          isRead: true,
          readAt: true,
          createdAt: true,
        },
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId: user.id, isRead: false } }),
    ])

    return ok({
      items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('[storefront/notifications] Error:', err)
    return serverError('Failed to load notifications')
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error!

    const body = await request.json()
    const { notificationIds, markAll } = body as { notificationIds?: string[]; markAll?: boolean }

    if (markAll) {
      const result = await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return ok({ updated: result.count })
    }

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return badRequest('Provide notificationIds array or markAll: true')
    }

    const result = await db.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    })

    return ok({ updated: result.count })
  } catch (err) {
    console.error('[storefront/notifications] PUT Error:', err)
    return serverError('Failed to update notifications')
  }
}
