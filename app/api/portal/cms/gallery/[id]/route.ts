export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'cms.homepage')
  if (error || !employee) return error!

  try {
    const existing = await db.galleryItem.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    const body = await request.json()
    const updated = await db.galleryItem.update({ where: { id: params.id }, data: body })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.gallery.updated', resourceType: 'GalleryItem', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok(updated)
  } catch (err) {
    console.error('[cms/gallery/id] PUT:', err)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'cms.homepage')
  if (error || !employee) return error!

  try {
    await db.galleryItem.delete({ where: { id: params.id } })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.gallery.deleted', resourceType: 'GalleryItem', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok({ deleted: true })
  } catch (err) {
    console.error('[cms/gallery/id] DELETE:', err)
    return serverError()
  }
}
