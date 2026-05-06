export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

// ─── GET: Single coupon detail ──────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'offers.view')
  if (error) return error

  try {
    const coupon = await db.coupon.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { orders: true } },
      },
    })
    if (!coupon) return notFound('Coupon not found')

    return ok({
      ...coupon,
      discountValue: Number(coupon.discountValue),
      minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      orderCount: coupon._count.orders,
    })
  } catch (err) {
    console.error('Coupon detail error:', err)
    return serverError()
  }
}

// ─── PUT: Update coupon ─────────────────────────────────────────

const updateSchema = z.object({
  description:     z.string().optional(),
  discountValue:   z.number().min(0).optional(),
  minOrderValue:   z.number().min(0).nullable().optional(),
  maxDiscount:     z.number().min(0).nullable().optional(),
  maxRedemptions:  z.number().int().min(1).nullable().optional(),
  isActive:        z.boolean().optional(),
  endsAt:          z.string().datetime().nullable().optional(),
  terms:           z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'offers.manage')
  if (error) return error

  try {
    const existing = await db.coupon.findUnique({ where: { id: params.id } })
    if (!existing) return notFound('Coupon not found')

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.endsAt !== undefined) {
      updateData.endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
    }

    const updated = await db.coupon.update({
      where: { id: params.id },
      data: updateData,
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'coupon.updated',
      resourceType: 'Coupon',
      resourceId: params.id,
      payload: {
        before: { isActive: String(existing.isActive), discountValue: String(existing.discountValue) },
        after: { isActive: String(updated.isActive), discountValue: String(updated.discountValue) },
      },
    })

    return ok({ id: updated.id, code: updated.code })
  } catch (err) {
    console.error('Coupon update error:', err)
    return serverError()
  }
}

// ─── DELETE: Deactivate coupon ──────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'offers.manage')
  if (error) return error

  try {
    const existing = await db.coupon.findUnique({ where: { id: params.id } })
    if (!existing) return notFound('Coupon not found')

    await db.coupon.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'coupon.deactivated',
      resourceType: 'Coupon',
      resourceId: params.id,
      payload: { before: { code: existing.code, isActive: 'true' } },
    })

    return ok({ success: true })
  } catch (err) {
    console.error('Coupon deactivate error:', err)
    return serverError()
  }
}
