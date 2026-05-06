export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

// GET /api/portal/shipping/zones — List all shipping zones
export async function GET(request: Request) {
  try {
    const { error, employee } = await requirePermission(request, 'settings.manage')
    if (error || !employee) return error!

    const zones = await db.shippingZone.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { pincodes: true } } },
    })

    return ok(zones)
  } catch (err) {
    console.error('Shipping zones GET error:', err)
    return serverError()
  }
}

const zoneSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['METRO', 'TIER1', 'TIER2', 'TIER3', 'RURAL', 'REMOTE', 'NON_SERVICEABLE']),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

// POST /api/portal/shipping/zones — Create a new zone
export async function POST(request: Request) {
  try {
    const { error, employee } = await requirePermission(request, 'settings.manage')
    if (error || !employee) return error!

    const body = await request.json()
    const parsed = zoneSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid zone data', parsed.error.flatten())

    const zone = await db.shippingZone.create({ data: parsed.data })

    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'SHIPPING_ZONE_CREATED',
      resourceType: 'ShippingZone',
      resourceId: zone.id,
      payload: { after: { name: zone.name, type: zone.type } },
    })

    return ok(zone)
  } catch (err) {
    console.error('Shipping zones POST error:', err)
    return serverError()
  }
}
