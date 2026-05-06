export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, badRequest, serverError, created } from '@/lib/api-response'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'cms.banners')
  if (error) return error

  try {
    const sp = request.nextUrl.searchParams
    const type = sp.get('type') // 'hero' | 'promo' | null (all)

    const banners = type === 'hero'
      ? await db.heroBanner.findMany({ orderBy: { sortOrder: 'asc' } })
      : type === 'promo'
        ? await db.banner.findMany({ orderBy: { sortOrder: 'asc' } })
        : {
            hero: await db.heroBanner.findMany({ orderBy: { sortOrder: 'asc' } }),
            promo: await db.banner.findMany({ orderBy: { sortOrder: 'asc' } }),
          }

    return ok(banners)
  } catch (err) {
    console.error('[cms/banners] GET:', err)
    return serverError()
  }
}

const heroSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  linkUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
})

const promoSchema = z.object({
  name: z.string().min(1),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  linkUrl: z.string().optional(),
  position: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const { error, employee } = await requirePermission(request, 'cms.banners')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const type = body.bannerType ?? 'hero'

    if (type === 'hero') {
      const parsed = heroSchema.safeParse(body)
      if (!parsed.success) return badRequest('Invalid hero banner data', parsed.error.flatten())

      const banner = await db.heroBanner.create({
        data: {
          ...parsed.data,
          bannerType: body.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        },
      })

      await logAuditEntry({
        employeeId: employee.id, role: employee.role,
        action: 'cms.hero_banner.created', resourceType: 'HeroBanner', resourceId: banner.id,
      })

      await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
      return created(banner)
    } else {
      const parsed = promoSchema.safeParse(body)
      if (!parsed.success) return badRequest('Invalid banner data', parsed.error.flatten())

      const banner = await db.banner.create({
        data: {
          ...parsed.data,
          bannerType: body.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        },
      })

      await logAuditEntry({
        employeeId: employee.id, role: employee.role,
        action: 'cms.banner.created', resourceType: 'Banner', resourceId: banner.id,
      })

      await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
      return created(banner)
    }
  } catch (err) {
    console.error('[cms/banners] POST:', err)
    return serverError()
  }
}
