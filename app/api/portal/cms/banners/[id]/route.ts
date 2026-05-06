export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'cms.banners')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const { type, ...data } = body as { type?: string; [key: string]: unknown }

    if (type === 'promo') {
      const banner = await db.banner.findUnique({ where: { id: params.id } })
      if (!banner) return notFound()

      const updated = await db.banner.update({
        where: { id: params.id },
        data: {
          ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
          startsAt: data.startsAt ? new Date(data.startsAt as string) : undefined,
          endsAt: data.endsAt ? new Date(data.endsAt as string) : undefined,
        },
      })

      await logAuditEntry({
        employeeId: employee.id, role: employee.role,
        action: 'cms.banner.updated', resourceType: 'Banner', resourceId: params.id,
      })

      await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
      return ok(updated)
    } else {
      const banner = await db.heroBanner.findUnique({ where: { id: params.id } })
      if (!banner) return notFound()

      const updated = await db.heroBanner.update({
        where: { id: params.id },
        data: {
          ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
          startsAt: data.startsAt ? new Date(data.startsAt as string) : undefined,
          endsAt: data.endsAt ? new Date(data.endsAt as string) : undefined,
        },
      })

      await logAuditEntry({
        employeeId: employee.id, role: employee.role,
        action: 'cms.hero_banner.updated', resourceType: 'HeroBanner', resourceId: params.id,
      })

      await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
      return ok(updated)
    }
  } catch (err) {
    console.error('[cms/banners/id] PUT:', err)
    return serverError()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'cms.banners')
  if (error || !employee) return error!

  try {
    const body = await request.json().catch(() => ({}))
    const type = (body as { type?: string }).type

    if (type === 'promo') {
      await db.banner.delete({ where: { id: params.id } })
      await logAuditEntry({
        employeeId: employee.id, role: employee.role,
        action: 'cms.banner.deleted', resourceType: 'Banner', resourceId: params.id,
      })
    } else {
      await db.heroBanner.delete({ where: { id: params.id } })
      await logAuditEntry({
        employeeId: employee.id, role: employee.role,
        action: 'cms.hero_banner.deleted', resourceType: 'HeroBanner', resourceId: params.id,
      })
    }

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok({ deleted: true })
  } catch (err) {
    console.error('[cms/banners/id] DELETE:', err)
    return serverError()
  }
}
