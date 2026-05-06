export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

// GET /api/portal/shipping/policies — List all shipping policies
export async function GET(request: Request) {
  try {
    const { error } = await requirePermission(request, 'settings.manage')
    if (error) return error

    const policies = await db.shippingPolicy.findMany({
      include: {
        originZone: { select: { id: true, name: true, type: true } },
        destinationZone: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ originZone: { name: 'asc' } }, { destinationZone: { name: 'asc' } }],
    })

    return ok(policies)
  } catch (err) {
    console.error('Shipping policies GET error:', err)
    return serverError()
  }
}

const policySchema = z.object({
  originZoneId: z.string().min(1),
  destinationZoneId: z.string().min(1),
  minDays: z.number().int().min(1),
  maxDays: z.number().int().min(1),
  baseCost: z.number().min(0),
  perKgCost: z.number().min(0).optional(),
  freeShippingAbove: z.number().nullable().optional(),
  isExpressAvailable: z.boolean().optional(),
  expressMinDays: z.number().int().nullable().optional(),
  expressMaxDays: z.number().int().nullable().optional(),
  expressCost: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
})

// POST /api/portal/shipping/policies — Create or update a policy
export async function POST(request: Request) {
  try {
    const { error, employee } = await requirePermission(request, 'settings.manage')
    if (error || !employee) return error!

    const body = await request.json()
    const parsed = policySchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid policy data', parsed.error.flatten())

    const data = parsed.data

    const policy = await db.shippingPolicy.upsert({
      where: {
        originZoneId_destinationZoneId: {
          originZoneId: data.originZoneId,
          destinationZoneId: data.destinationZoneId,
        },
      },
      update: data,
      create: {
        ...data,
        perKgCost: data.perKgCost ?? 0,
      },
    })

    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'SHIPPING_POLICY_UPDATED',
      resourceType: 'ShippingPolicy',
      resourceId: policy.id,
      payload: { after: { origin: data.originZoneId, dest: data.destinationZoneId } },
    })

    return ok(policy)
  } catch (err) {
    console.error('Shipping policies POST error:', err)
    return serverError()
  }
}
