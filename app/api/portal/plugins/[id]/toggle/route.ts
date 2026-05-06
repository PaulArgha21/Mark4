export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, requireCredentialElevation } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidatePluginCache } from '@/lib/plugins'
import { ok, notFound, forbidden, serverError } from '@/lib/api-response'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, employee } = await requirePermission(request, 'plugins.manage')
    if (error || !employee) return error!

    // Credential gate required for plugin toggling
    const elevated = await requireCredentialElevation(employee.id)
    if (!elevated) {
      return forbidden('Credential elevation required to toggle plugins')
    }

    const plugin = await db.plugin.findUnique({ where: { id: params.id } })
    if (!plugin) return notFound('Plugin not found')

    const updated = await db.plugin.update({
      where: { id: params.id },
      data: { isActive: !plugin.isActive },
      include: { hooks: true },
    })

    // If deactivating, also deactivate all hooks
    if (!updated.isActive) {
      await db.pluginHook.updateMany({
        where: { pluginId: params.id },
        data: { isActive: false },
      })
    }

    // Invalidate plugin cache
    await invalidatePluginCache()

    // Audit log
    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: updated.isActive ? 'plugin.activated' : 'plugin.deactivated',
      resourceType: 'Plugin',
      resourceId: params.id,
      payload: { before: { isActive: plugin.isActive } as Record<string, unknown>, after: { isActive: updated.isActive } as Record<string, unknown>, context: { name: plugin.name } },
    })

    return ok({
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
      message: `Plugin ${updated.isActive ? 'activated' : 'deactivated'}`,
    })
  } catch (err) {
    console.error('[portal/plugins/toggle] Error:', err)
    return serverError('Failed to toggle plugin')
  }
}
