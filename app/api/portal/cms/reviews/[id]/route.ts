export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'reviews.moderate')
  if (error || !employee) return error!

  try {
    const existing = await db.review.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    const body = await request.json()
    const { action, adminReply } = body as { action?: 'approve' | 'reject' | 'reply'; adminReply?: string }

    const data: Record<string, unknown> = {}

    if (action === 'approve') {
      data.isApproved = true
    } else if (action === 'reject') {
      data.isApproved = false
    }

    if (adminReply !== undefined) {
      data.adminReply = adminReply
      data.adminReplyAt = new Date()
    }

    const updated = await db.review.update({ where: { id: params.id }, data })

    // Update product average rating if approval status changed
    if (action === 'approve' || action === 'reject') {
      const agg = await db.review.aggregate({
        where: { productId: existing.productId, isApproved: true },
        _avg: { rating: true },
        _count: { rating: true },
      })
      await db.product.update({
        where: { id: existing.productId },
        data: {
          averageRating: agg._avg.rating ?? 0,
          reviewCount: agg._count.rating,
        },
      })
    }

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: `cms.review.${action ?? 'updated'}`, resourceType: 'Review', resourceId: params.id,
      payload: { context: { productId: existing.productId, action } },
    })

    return ok(updated)
  } catch (err) {
    console.error('[cms/reviews/id] PUT:', err)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'reviews.moderate')
  if (error || !employee) return error!

  try {
    const existing = await db.review.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    await db.review.delete({ where: { id: params.id } })

    // Recalculate product rating
    const agg = await db.review.aggregate({
      where: { productId: existing.productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    })
    await db.product.update({
      where: { id: existing.productId },
      data: { averageRating: agg._avg.rating ?? 0, reviewCount: agg._count.rating },
    })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.review.deleted', resourceType: 'Review', resourceId: params.id,
    })

    return ok({ deleted: true })
  } catch (err) {
    console.error('[cms/reviews/id] DELETE:', err)
    return serverError()
  }
}
