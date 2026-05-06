export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

const receiveItemSchema = z.object({
  itemId:           z.string().min(1),
  quantityReceived: z.number().int().min(0),
})

const receiveSchema = z.object({
  items: z.array(receiveItemSchema).min(1),
  notes: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'inventory.update')
  if (error) return error

  try {
    const po = await db.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: true },
    })
    if (!po) return notFound('Purchase order not found')
    if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
      return badRequest(`PO is already ${po.status}`)
    }

    const body = await request.json()
    const parsed = receiveSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const { items: receivedItems, notes } = parsed.data

    await db.$transaction(async (tx) => {
      let allFullyReceived = true

      for (const ri of receivedItems) {
        const poItem = po.items.find(i => i.id === ri.itemId)
        if (!poItem) continue

        const newReceived = poItem.quantityReceived + ri.quantityReceived
        if (newReceived > poItem.quantityOrdered) {
          throw new Error(`Cannot receive more than ordered for item ${ri.itemId}`)
        }
        if (newReceived < poItem.quantityOrdered) allFullyReceived = false

        // Update PO item
        await tx.purchaseOrderItem.update({
          where: { id: ri.itemId },
          data: { quantityReceived: newReceived },
        })

        // Add to inventory
        if (ri.quantityReceived > 0) {
          await tx.inventory.upsert({
            where: { variantId: poItem.variantId },
            update: { quantity: { increment: ri.quantityReceived } },
            create: { variantId: poItem.variantId, quantity: ri.quantityReceived },
          })

          // Record movement
          await tx.inventoryMovement.create({
            data: {
              variantId: poItem.variantId,
              type: 'PURCHASE',
              quantity: ri.quantityReceived,
              reference: `PO ${po.poNumber}`,
              referenceId: po.id,
              notes,
              createdById: employee!.id,
            },
          })
        }
      }

      // Check remaining items
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: params.id },
      })
      const fullyReceived = updatedItems.every(i => i.quantityReceived >= i.quantityOrdered)
      const partiallyReceived = updatedItems.some(i => i.quantityReceived > 0)

      await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          status: fullyReceived ? 'RECEIVED' : partiallyReceived ? 'PARTIALLY_RECEIVED' : po.status,
          receivedDate: fullyReceived ? new Date() : null,
        },
      })
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'purchase_order.received',
      resourceType: 'PurchaseOrder',
      resourceId: params.id,
      payload: {
        after: {
          poNumber: po.poNumber,
          receivedItems: JSON.stringify(receivedItems),
        },
      },
    })

    return ok({ success: true, poNumber: po.poNumber })
  } catch (err) {
    console.error('PO receive error:', err)
    return serverError()
  }
}
