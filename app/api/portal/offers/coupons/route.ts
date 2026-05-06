export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission, requireCredentialElevation } from '@/lib/permissions'
import { ok, badRequest, conflict, forbidden, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// ─── GET: List coupons ──────────────────────────────────────────

const listQuery = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'expired', 'all']).default('all'),
  search: z.string().optional(),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'offers.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, status, search } = listQuery.parse(
      Object.fromEntries(searchParams)
    )

    const now = new Date()
    const where: Prisma.CouponWhereInput = {}

    if (status === 'active') {
      where.isActive = true
      where.OR = [{ endsAt: null }, { endsAt: { gte: now } }]
    } else if (status === 'inactive') {
      where.isActive = false
    } else if (status === 'expired') {
      where.endsAt = { lt: now }
    }

    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } as Prisma.CouponWhereInput,
      ]
    }

    const skip = (page - 1) * limit

    const [coupons, total, stats] = await Promise.all([
      db.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.coupon.count({ where }),
      // Aggregate stats
      Promise.all([
        db.coupon.count({ where: { isActive: true } }),
        db.coupon.aggregate({ where: { isActive: true }, _sum: { usedCount: true } }),
      ]),
    ])

    const items = coupons.map(c => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
      maxDiscount: c.maxDiscount ? Number(c.maxDiscount) : null,
      scope: c.scope,
      maxRedemptions: c.maxRedemptions,
      usedCount: c.usedCount,
      usageRate: c.maxRedemptions ? Math.round((c.usedCount / c.maxRedemptions) * 100) : null,
      isFirstPurchase: c.isFirstPurchase,
      isActive: c.isActive,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      isExpired: c.endsAt ? c.endsAt < now : false,
      createdAt: c.createdAt.toISOString(),
    }))

    const [activeCoupons, usageAgg] = stats

    return ok({
      items,
      stats: {
        activeCoupons,
        totalRedemptions: usageAgg._sum.usedCount ?? 0,
      },
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Coupons list error:', err)
    return serverError()
  }
}

// ─── POST: Create coupon ────────────────────────────────────────

const createSchema = z.object({
  code:            z.string().min(2).max(30).transform(s => s.toUpperCase()),
  description:     z.string().optional(),
  discountType:    z.enum(['PERCENTAGE', 'FIXED']),
  discountValue:   z.number().min(0),
  minOrderValue:   z.number().min(0).optional(),
  maxDiscount:     z.number().min(0).optional(),
  scope:           z.enum(['ALL', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES']).default('ALL'),
  applicableIds:   z.array(z.string()).default([]),
  maxRedemptions:  z.number().int().min(1).optional(),
  isFirstPurchase: z.boolean().default(false),
  startsAt:        z.string().datetime().optional(),
  endsAt:          z.string().datetime().optional(),
  terms:           z.string().optional(),
})

export async function POST(request: Request) {
  const { error, employee } = await requirePermission(request, 'offers.manage')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const data = parsed.data

    // Credential elevation for >= 40% discount
    if (data.discountType === 'PERCENTAGE' && data.discountValue >= 40) {
      const elevated = await requireCredentialElevation(employee!.id)
      if (!elevated) {
        return forbidden('Credential elevation required for discounts >= 40%')
      }
    }

    // Check code uniqueness
    const existing = await db.coupon.findUnique({ where: { code: data.code } })
    if (existing) return conflict('Coupon code already exists')

    const coupon = await db.coupon.create({
      data: {
        code: data.code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderValue: data.minOrderValue,
        maxDiscount: data.maxDiscount,
        scope: data.scope,
        applicableIds: data.applicableIds,
        maxRedemptions: data.maxRedemptions,
        isFirstPurchase: data.isFirstPurchase,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        terms: data.terms,
        createdById: employee!.id,
      },
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'coupon.created',
      resourceType: 'Coupon',
      resourceId: coupon.id,
      payload: {
        after: {
          code: data.code,
          discountType: data.discountType,
          discountValue: String(data.discountValue),
        },
      },
    })

    return ok({ id: coupon.id, code: coupon.code })
  } catch (err) {
    console.error('Coupon create error:', err)
    return serverError()
  }
}
