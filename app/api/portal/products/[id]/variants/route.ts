export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, notFound, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

// ─── PUT: Save a single variant (color group) for a product ─────────

const warehouseEntrySchema = z.object({
  warehouseName: z.string().min(1),
  pincode:       z.string().length(6),
  quantity:      z.number().int().min(0).default(0),
})

const variantSaveSchema = z.object({
  colorName:     z.string().min(1),
  colorHex:      z.string().optional(),
  sku:           z.string().min(1),
  price:         z.number().min(0),
  compareAtPrice: z.number().min(0).optional(),
  costPrice:     z.number().min(0).optional(),
  weight:        z.number().optional(),
  isActive:      z.boolean().default(true),
  sizeQuantities: z.array(z.object({
    size: z.string().min(1),
    warehouses: z.array(warehouseEntrySchema).default([]),
  })),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const product = await db.product.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, basePrice: true, salePrice: true, costPrice: true },
    })
    if (!product) return notFound('Product not found')

    const body = await request.json()
    const parsed = variantSaveSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid variant data', parsed.error.flatten())

    const data = parsed.data
    // Effective selling base = salePrice if discount exists, else basePrice
    const sp = product.salePrice ? Number(product.salePrice) : null
    const bp = Number(product.basePrice) || 0
    const effectiveBase = sp || bp
    const priceDelta = data.price - effectiveBase

    // Update product-level pricing if compare/cost changed
    const productUpdates: Record<string, unknown> = {}
    if (data.compareAtPrice && data.compareAtPrice > data.price) {
      // Update basePrice = MRP if this compareAt is higher
      if (data.compareAtPrice > bp) productUpdates.basePrice = data.compareAtPrice
      // Set salePrice to selling price if not already set
      if (!sp || data.price < sp) productUpdates.salePrice = data.price
    }
    if (data.costPrice !== undefined) {
      const currentCost = product.costPrice ? Number(product.costPrice) : Infinity
      if (data.costPrice < currentCost || currentCost === Infinity) productUpdates.costPrice = data.costPrice
    }

    await db.$transaction(async (tx) => {
      // Find existing DB variants for this color
      const existingVariants = await tx.productVariant.findMany({
        where: { productId: params.id, color: data.colorName },
        select: { id: true, size: true },
      })

      const existingBySize = new Map(existingVariants.map(v => [v.size || 'FREE', v.id]))
      const processedSizes = new Set<string>()

      for (let si = 0; si < data.sizeQuantities.length; si++) {
        const sq = data.sizeQuantities[si]
        const sizeKey = sq.size || 'FREE'
        processedSizes.add(sizeKey)
        let variantId: string

        if (existingBySize.has(sizeKey)) {
          // Update existing variant
          variantId = existingBySize.get(sizeKey)!
          await tx.productVariant.update({
            where: { id: variantId },
            data: {
              sku: `${data.sku}-${sq.size}`,
              name: [data.colorName, sq.size].filter(Boolean).join(' / ') || undefined,
              color: data.colorName,
              colorHex: data.colorHex,
              priceDelta,
              weight: data.weight,
              isActive: data.isActive && sq.warehouses.some(w => w.quantity > 0),
              sortOrder: si,
            },
          })
        } else {
          // Create new variant for this size
          const variant = await tx.productVariant.create({
            data: {
              productId: params.id,
              sku: `${data.sku}-${sq.size}`,
              name: [data.colorName, sq.size].filter(Boolean).join(' / ') || undefined,
              size: sq.size,
              color: data.colorName,
              colorHex: data.colorHex,
              priceDelta,
              weight: data.weight,
              isActive: data.isActive && sq.warehouses.some(w => w.quantity > 0),
              sortOrder: si,
            },
          })
          variantId = variant.id
        }

        // Sync inventory for this variant
        await tx.inventory.deleteMany({ where: { variantId } })
        if (sq.warehouses.length > 0) {
          for (const wh of sq.warehouses) {
            if (wh.warehouseName && wh.pincode && wh.quantity > 0) {
              const code = `${wh.warehouseName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}-${wh.pincode}`
              const warehouse = await tx.warehouseLocation.upsert({
                where: { code },
                update: { name: wh.warehouseName, pincode: wh.pincode },
                create: { name: wh.warehouseName, code, pincode: wh.pincode, isActive: true },
              })
              await tx.inventory.create({
                data: { variantId, quantity: wh.quantity, warehouseId: warehouse.id },
              })
            }
          }
        } else {
          await tx.inventory.create({
            data: { variantId, quantity: 0, warehouseId: null },
          })
        }
      }

      // Deactivate any sizes that were removed
      const existingEntries = Array.from(existingBySize.entries())
      for (const [size, id] of existingEntries) {
        if (!processedSizes.has(size)) {
          await tx.productVariant.update({
            where: { id },
            data: { isActive: false },
          })
        }
      }

      // Update product-level pricing
      if (Object.keys(productUpdates).length > 0) {
        await tx.product.update({
          where: { id: params.id },
          data: productUpdates,
        })
      }
    })

    // Audit
    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.variant_updated',
      resourceType: 'Product',
      resourceId: params.id,
      payload: { after: { color: data.colorName, sku: data.sku } },
    })

    return ok({ success: true, color: data.colorName })
  } catch (err) {
    console.error('Variant save error:', err)
    return serverError()
  }
}
