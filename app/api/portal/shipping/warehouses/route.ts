export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'

// GET /api/portal/shipping/warehouses — List warehouses with pincode info
export async function GET(request: Request) {
  try {
    const { error } = await requirePermission(request, 'settings.manage')
    if (error) return error

    const warehouses = await db.warehouseLocation.findMany({
      orderBy: { name: 'asc' },
    })

    return ok(warehouses)
  } catch (err) {
    console.error('Warehouses GET error:', err)
    return serverError()
  }
}
