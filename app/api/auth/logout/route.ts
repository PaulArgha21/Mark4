export const runtime = 'nodejs'

import { ok } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  return ok({ success: true })
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  const url = new URL('/', request.url)
  return NextResponse.redirect(url)
}
