export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'promotions.manage')
  if (error || !employee) return error!

  try {
    const existing = await db.promotion.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    const body = await request.json()
    const data: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined) data[k] = v
    }
    if (data.startsAt) data.startsAt = new Date(data.startsAt as string)
    if (data.endsAt) data.endsAt = new Date(data.endsAt as string)

    const updated = await db.promotion.update({ where: { id: params.id }, data })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.promotion.updated', resourceType: 'Promotion', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok(updated)
  } catch (err) {
    console.error('[cms/promotions/id] PUT:', err)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'promotions.manage')
  if (error || !employee) return error!

  try {
    await db.promotion.delete({ where: { id: params.id } })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.promotion.deleted', resourceType: 'Promotion', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok({ deleted: true })
  } catch (err) {
    console.error('[cms/promotions/id] DELETE:', err)
    return serverError()
  }
}
