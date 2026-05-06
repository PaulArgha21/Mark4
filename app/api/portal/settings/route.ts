export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'settings.manage')
  if (error) return error

  try {
    const settings = await db.siteSetting.findFirst()
    if (!settings) {
      return ok({
        siteName: 'Aprdite',
        tagline: '',
        logoUrl: '',
        faviconUrl: '',
        announcementText: '',
        announcementLink: '',
        primaryColor: '#d6336c',
        metaTitle: '',
        metaDescription: '',
        contactEmail: '',
        contactPhone: '',
        socialFacebook: '',
        socialInstagram: '',
        socialTwitter: '',
        socialYoutube: '',
        footerText: '',
      })
    }
    return ok(settings)
  } catch (err) {
    console.error('[portal/settings] GET:', err)
    return serverError()
  }
}

const emptyToNull = z.string().transform(v => v.trim() === '' ? null : v.trim())
const optStr = (max: number) => emptyToNull.pipe(z.string().max(max).nullable()).optional()

const settingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  tagline: optStr(300),
  logoUrl: optStr(500),
  faviconUrl: optStr(500),
  heroTitle: optStr(300),
  heroSubtitle: optStr(500),
  announcementText: optStr(500),
  announcementLink: optStr(500),
  primaryColor: z.string().max(20).optional(),
  metaTitle: optStr(200),
  metaDescription: optStr(500),
  contactEmail: emptyToNull.pipe(z.string().email().max(200).nullable()).optional(),
  contactPhone: optStr(30),
  socialFacebook: optStr(300),
  socialInstagram: optStr(300),
  socialTwitter: optStr(300),
  socialYoutube: optStr(300),
  footerText: optStr(2000),
})

export async function PUT(request: NextRequest) {
  const { error, employee } = await requirePermission(request, 'settings.manage')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid settings data', parsed.error.flatten())

    // Find or create the settings row
    let settings = await db.siteSetting.findFirst()
    if (settings) {
      settings = await db.siteSetting.update({
        where: { id: settings.id },
        data: parsed.data,
      })
    } else {
      settings = await db.siteSetting.create({
        data: {
          siteName: parsed.data.siteName ?? 'Aprdite',
          ...parsed.data,
        },
      })
    }

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'settings.updated', resourceType: 'SiteSetting', resourceId: settings.id,
      payload: { context: { fields: Object.keys(parsed.data) } },
    })

    // Invalidate site settings cache
    await invalidateCmsCache([
      { key: CACHE_KEYS.siteSettings, revalidatePaths: ['/'] },
    ])

    return ok(settings)
  } catch (err) {
    console.error('[portal/settings] PUT:', err)
    return serverError()
  }
}
