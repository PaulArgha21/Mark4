export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { getActivePluginsForHook } from '@/lib/plugins'
import { ok, badRequest } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const hookName = request.nextUrl.searchParams.get('hookName')
    if (!hookName) return badRequest('hookName query param required')

    const plugins = await getActivePluginsForHook(hookName)
    return ok(plugins)
  } catch (err) {
    console.error('[plugins/hooks] Error:', err)
    return ok([])
  }
}
