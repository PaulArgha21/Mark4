export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'

export async function GET() {
  const checks = { db: 'error', redis: 'error' }

  try {
    await db.$queryRaw`SELECT 1`
    checks.db = 'ok'
  } catch {}

  try {
    await redis.ping()
    checks.redis = 'ok'
  } catch {}

  const healthy = Object.values(checks).every(v => v === 'ok')
  return NextResponse.json(checks, { status: healthy ? 200 : 503 })
}
