export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET ?? ''

// Weekly cleanup of old analytics events, search queries, and processed webhooks
// Keeps last 90 days of data
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret')
      ?? request.headers.get('authorization')?.replace('Bearer ', '')
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    const [events, searches, webhooks, userEvents] = await Promise.all([
      db.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      db.searchQuery.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      db.webhookEvent.deleteMany({ where: { processed: true, createdAt: { lt: cutoff } } }),
      db.userEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    ])

    const result = {
      cleaned: {
        analyticsEvents: events.count,
        searchQueries: searches.count,
        webhookEvents: webhooks.count,
        userEvents: userEvents.count,
      },
      cutoffDate: cutoff.toISOString(),
      timestamp: new Date().toISOString(),
    }

    console.log('[cron/cleanup-events]', JSON.stringify(result))

    return NextResponse.json({ status: 'ok', data: result })
  } catch (err) {
    console.error('[cron/cleanup-events] Error:', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
