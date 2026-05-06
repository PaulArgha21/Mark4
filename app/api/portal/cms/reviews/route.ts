export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'reviews.moderate')
  if (error) return error

  try {
    const sp = request.nextUrl.searchParams
    const status = sp.get('status') // 'pending' | 'approved' | 'all'
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
    const limit = Math.min(50, parseInt(sp.get('limit') ?? '20'))

    const where = status === 'pending'
      ? { isApproved: false }
      : status === 'approved'
        ? { isApproved: true }
        : {}

    const [reviews, total, pendingCount] = await Promise.all([
      db.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: { select: { id: true, name: true, slug: true, media: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      db.review.count({ where }),
      db.review.count({ where: { isApproved: false } }),
    ])

    return ok({
      items: reviews,
      pendingCount,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[cms/reviews] GET:', err)
    return serverError()
  }
}
