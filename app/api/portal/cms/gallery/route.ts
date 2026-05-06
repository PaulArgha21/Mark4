export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, badRequest, serverError, created } from '@/lib/api-response'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'cms.homepage')
  if (error) return error

  try {
    const items = await db.galleryItem.findMany({ orderBy: { sortOrder: 'asc' } })
    return ok(items)
  } catch (err) {
    console.error('[cms/gallery] GET:', err)
    return serverError()
  }
}

const gallerySchema = z.object({
  imageUrl: z.string().url(),
  videoUrl: z.string().url().optional().nullable(),
  caption: z.string().optional().nullable(),
  linkUrl: z.string().optional().nullable(),
  sizeClass: z.enum(['small', 'medium', 'large', 'tall', 'wide']).default('medium'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
})

export async function POST(request: NextRequest) {
  const { error, employee } = await requirePermission(request, 'cms.homepage')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const parsed = gallerySchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid gallery data', parsed.error.flatten())

    const item = await db.galleryItem.create({ data: parsed.data })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.gallery.created', resourceType: 'GalleryItem', resourceId: item.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return created(item)
  } catch (err) {
    console.error('[cms/gallery] POST:', err)
    return serverError()
  }
}
