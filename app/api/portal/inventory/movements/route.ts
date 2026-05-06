export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const querySchema = z.object({
  page:      z.coerce.number().min(1).default(1),
  limit:     z.coerce.number().min(1).max(100).default(30),
  variantId: z.string().optional(),
  type:      z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate:   z.string().datetime().optional(),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'inventory.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, variantId, type, startDate, endDate } = querySchema.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.InventoryMovementWhereInput = {}
    if (variantId) where.variantId = variantId
    if (type) where.type = type as never
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const skip = (page - 1) * limit

    const [movements, total] = await Promise.all([
      db.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          variant: {
            select: {
              sku: true, size: true, color: true,
              product: { select: { name: true, slug: true } },
            },
          },
        },
      }),
      db.inventoryMovement.count({ where }),
    ])

    const items = movements.map(m => ({
      id: m.id,
      variantId: m.variantId,
      sku: m.variant.sku,
      productName: m.variant.product.name,
      variant: [m.variant.color, m.variant.size].filter(Boolean).join(' / '),
      type: m.type,
      quantity: m.quantity,
      reference: m.reference,
      notes: m.notes,
      createdById: m.createdById,
      createdAt: m.createdAt.toISOString(),
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
    console.error('Inventory movements error:', err)
    return serverError()
  }
}
