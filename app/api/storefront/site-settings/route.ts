export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { ok, serverError } from '@/lib/api-response'
import { CACHE_KEYS } from '@/lib/cache'

const CACHE_TTL = 300 // 5 minutes

export async function GET() {
  try {
    // 1. Try Redis cache (fail-safe)
    try {
      const cached = await redis.get(CACHE_KEYS.siteSettings)
      if (cached) {
        return ok(typeof cached === 'string' ? JSON.parse(cached) : cached)
      }
    } catch (cacheErr) {
      console.warn('Site settings cache read failed:', cacheErr)
    }

    // 2. Fetch from DB
    const settings = await db.siteSetting.findFirst({
      select: {
        siteName: true,
        tagline: true,
        logoUrl: true,
        announcementText: true,
        announcementLink: true,
        primaryColor: true,
        metaTitle: true,
        metaDescription: true,
        contactEmail: true,
        contactPhone: true,
        socialFacebook: true,
        socialInstagram: true,
        socialTwitter: true,
        socialYoutube: true,
        footerText: true,
      },
    })

    if (!settings) {
      return ok({
        siteName: 'Aprdite',
        tagline: 'Curated Fashion for the Modern Soul',
      })
    }

    // 3. Cache (fail-safe)
    try {
      await redis.set(CACHE_KEYS.siteSettings, JSON.stringify(settings), { ex: CACHE_TTL })
    } catch (cacheErr) {
      console.warn('Site settings cache write failed:', cacheErr)
    }

    return ok(settings)
  } catch (err) {
    console.error('Site settings API error:', err)
    return serverError()
  }
}
