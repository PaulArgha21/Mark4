export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { Prisma } from '@prisma/client'

// ─── GET: List purchase orders ──────────────────────────────────

const listQuery = z.object({
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(100).default(20),
  status:     z.string().optional(),
  supplierId: z.string().optional(),
  search:     z.string().optional(),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'inventory.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, status, supplierId, search } = listQuery.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.PurchaseOrderWhereInput = {}
    if (status) where.status = status as never
    if (supplierId) where.supplierId = supplierId
    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      db.purchaseOrder.count({ where }),
    ])

    const items = orders.map(o => ({
      id: o.id,
      poNumber: o.poNumber,
      supplier: o.supplier,
      status: o.status,
      itemCount: o._count.items,
      totalCost: Number(o.totalCost),
      expectedDate: o.expectedDate?.toISOString() ?? null,
      receivedDate: o.receivedDate?.toISOString() ?? null,
      createdAt: o.createdAt.toISOString(),
    }))

    return ok({
      items,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Purchase orders list error:', err)
    return serverError()
  }
}

// ─── POST: Create purchase order ────────────────────────────────

const poItemSchema = z.object({
  variantId:       z.string().min(1),
  sku:             z.string().min(1),
  quantityOrdered: z.number().int().min(1),
  costPerUnit:     z.number().min(0),
})

const createSchema = z.object({
  supplierId:   z.string().min(1),
  expectedDate: z.string().datetime().optional(),
  notes:        z.string().optional(),
  items:        z.array(poItemSchema).min(1),
})

export async function POST(request: Request) {
  const { error, employee } = await requirePermission(request, 'inventory.update')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const { supplierId, expectedDate, notes, items } = parsed.data

    // Compute total cost
    const totalCost = items.reduce((s, i) => s + i.quantityOrdered * i.costPerUnit, 0)

    // Generate PO number
    const poNumber = `PO-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`

    const po = await db.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes,
          totalCost,
          createdById: employee!.id,
        },
      })

      await tx.purchaseOrderItem.createMany({
        data: items.map(item => ({
          purchaseOrderId: order.id,
          variantId: item.variantId,
          sku: item.sku,
          quantityOrdered: item.quantityOrdered,
          costPerUnit: item.costPerUnit,
        })),
      })

      return order
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'purchase_order.created',
      resourceType: 'PurchaseOrder',
      resourceId: po.id,
      payload: { after: { poNumber, supplierId, totalCost: String(totalCost), itemCount: String(items.length) } },
    })

    return ok({ id: po.id, poNumber: po.poNumber })
  } catch (err) {
    console.error('Purchase order create error:', err)
    return serverError()
  }
}
