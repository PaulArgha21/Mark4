export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'cms.stories')
  if (error || !employee) return error!

  try {
    const existing = await db.storyBanner.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    const body = await request.json()
    const updated = await db.storyBanner.update({ where: { id: params.id }, data: body })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.story.updated', resourceType: 'StoryBanner', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok(updated)
  } catch (err) {
    console.error('[cms/stories/id] PUT:', err)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'cms.stories')
  if (error || !employee) return error!

  try {
    await db.storyBanner.delete({ where: { id: params.id } })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.story.deleted', resourceType: 'StoryBanner', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok({ deleted: true })
  } catch (err) {
    console.error('[cms/stories/id] DELETE:', err)
    return serverError()
  }
}
