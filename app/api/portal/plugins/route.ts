export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { error, employee } = await requirePermission(request, 'plugins.manage')
    if (error || !employee) return error!

    const plugins = await db.plugin.findMany({
      include: {
        hooks: {
          select: { id: true, hookName: true, isActive: true, config: true },
        },
      },
      orderBy: { installedAt: 'desc' },
    })

    const items = plugins.map(p => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      version: p.version,
      description: p.description,
      isActive: p.isActive,
      config: p.config,
      installedAt: p.installedAt,
      hooks: p.hooks,
      hookCount: p.hooks.length,
      activeHookCount: p.hooks.filter(h => h.isActive).length,
    }))

    return ok({ items, total: items.length })
  } catch (err) {
    console.error('[portal/plugins] Error:', err)
    return serverError('Failed to load plugins')
  }
}
