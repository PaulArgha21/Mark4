export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, badRequest, serverError, created } from '@/lib/api-response'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'cms.stories')
  if (error) return error

  try {
    const stories = await db.storyBanner.findMany({ orderBy: { sortOrder: 'asc' } })
    return ok(stories)
  } catch (err) {
    console.error('[cms/stories] GET:', err)
    return serverError()
  }
}

const storySchema = z.object({
  title: z.string().optional().nullable(),
  imageUrl: z.string().url(),
  linkUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
})

export async function POST(request: NextRequest) {
  const { error, employee } = await requirePermission(request, 'cms.stories')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const parsed = storySchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid story data', parsed.error.flatten())

    const story = await db.storyBanner.create({ data: parsed.data })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.story.created', resourceType: 'StoryBanner', resourceId: story.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return created(story)
  } catch (err) {
    console.error('[cms/stories] POST:', err)
    return serverError()
  }
}
