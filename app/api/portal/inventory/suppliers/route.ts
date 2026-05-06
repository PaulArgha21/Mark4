export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

// ─── GET: List suppliers ────────────────────────────────────────

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'inventory.view')
  if (error) return error

  try {
    const suppliers = await db.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { purchaseOrders: true } },
      },
    })

    const items = suppliers.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      address: s.address,
      gstNumber: s.gstNumber,
      isActive: s.isActive,
      poCount: s._count.purchaseOrders,
      createdAt: s.createdAt.toISOString(),
    }))

    return ok({ items })
  } catch (err) {
    console.error('Suppliers list error:', err)
    return serverError()
  }
}

// ─── POST: Create supplier ──────────────────────────────────────

const createSchema = z.object({
  name:      z.string().min(1).max(255),
  email:     z.string().email().optional(),
  phone:     z.string().optional(),
  address:   z.string().optional(),
  gstNumber: z.string().optional(),
})

export async function POST(request: Request) {
  const { error, employee } = await requirePermission(request, 'inventory.update')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const supplier = await db.supplier.create({ data: parsed.data })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'supplier.created',
      resourceType: 'Supplier',
      resourceId: supplier.id,
      payload: { after: { name: parsed.data.name } },
    })

    return ok({ id: supplier.id, name: supplier.name })
  } catch (err) {
    console.error('Supplier create error:', err)
    return serverError()
  }
}
