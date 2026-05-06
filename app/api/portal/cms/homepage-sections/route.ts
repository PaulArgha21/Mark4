export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { z } from 'zod'

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'cms.homepage')
  if (error) return error

  try {
    const sections = await db.homepageSection.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return ok(sections)
  } catch (err) {
    console.error('CMS sections GET error:', err)
    return serverError()
  }
}

const updateSchema = z.object({
  sections: z.array(z.object({
    id: z.string(),
    type: z.string(),
    isVisible: z.boolean(),
    sortOrder: z.number(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
})

export async function PUT(request: Request) {
  const { error, employee } = await requirePermission(request, 'cms.homepage')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid body', parsed.error.flatten())

    // Update all sections in a transaction
    await db.$transaction(
      parsed.data.sections.map(section =>
        db.homepageSection.update({
          where: { id: section.id },
          data: {
            isVisible: section.isVisible,
            sortOrder: section.sortOrder,
            config: section.config ? JSON.parse(JSON.stringify(section.config)) : undefined,
          },
        })
      )
    )

    // Audit log
    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'cms.homepage_sections.updated',
      resourceType: 'HomepageSection',
      resourceId: 'bulk',
      payload: { after: Object.fromEntries(parsed.data.sections.map((s, i) => [String(i), s])) },
    })

    // Invalidate cache
    await invalidateCmsCache([{
      key: CACHE_KEYS.homepage,
      revalidatePaths: ['/'],
      broadcastEvent: 'homepage-updated',
    }])

    return ok({ updated: true })
  } catch (err) {
    console.error('CMS sections PUT error:', err)
    return serverError()
  }
}
