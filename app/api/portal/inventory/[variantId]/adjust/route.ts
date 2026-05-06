export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { z } from 'zod'

const adjustSchema = z.object({
  newQty:  z.number().int().min(0),
  reason:  z.string().min(1),
  notes:   z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { variantId: string } }
) {
  const { error, employee } = await requirePermission(request, 'inventory.adjust')
  if (error) return error

  try {
    const inventory = await db.inventory.findUnique({
      where: { variantId: params.variantId },
      include: {
        variant: {
          select: {
            sku: true,
            product: { select: { slug: true, name: true } },
          },
        },
      },
    })

    if (!inventory) return notFound('Inventory record not found')

    const body = await request.json()
    const parsed = adjustSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const { newQty, reason, notes } = parsed.data
    const previousQty = inventory.quantity
    const delta = newQty - previousQty

    if (delta === 0) return ok({ message: 'No change', quantity: newQty })

    // Transaction: update inventory + create adjustment record + create movement
    await db.$transaction([
      db.inventory.update({
        where: { variantId: params.variantId },
        data: { quantity: newQty },
      }),
      db.stockAdjustment.create({
        data: {
          variantId: params.variantId,
          sku: inventory.variant.sku,
          previousQty,
          newQty,
          delta,
          reason,
          notes,
          adjustedById: employee!.id,
        },
      }),
      db.inventoryMovement.create({
        data: {
          variantId: params.variantId,
          type: 'ADJUSTMENT',
          quantity: delta,
          reference: reason,
          notes,
          createdById: employee!.id,
        },
      }),
    ])

    // Audit
    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'inventory.adjusted',
      resourceType: 'Inventory',
      resourceId: inventory.id,
      payload: {
        before: { quantity: String(previousQty) },
        after: { quantity: String(newQty), delta: String(delta), reason },
        context: { sku: inventory.variant.sku, product: inventory.variant.product.name },
      },
    })

    // Invalidate product cache + ISR
    const slug = inventory.variant.product.slug
    await invalidateCmsCache([
      { key: CACHE_KEYS.product(slug), revalidatePaths: [`/product/${slug}`], broadcastEvent: 'stock-updated' },
    ])

    return ok({
      variantId: params.variantId,
      sku: inventory.variant.sku,
      previousQty,
      newQty,
      delta,
      backInStock: previousQty <= 0 && newQty > 0,
    })
  } catch (err) {
    console.error('Stock adjustment error:', err)
    return serverError()
  }
}
