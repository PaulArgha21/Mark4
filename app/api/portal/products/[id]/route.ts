export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission, requireCredentialElevation } from '@/lib/permissions'
import { ok, notFound, badRequest, forbidden, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { z } from 'zod'

// ─── GET: Single product detail (portal view) ───────────────────

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'products.view')
  if (error) return error

  try {
    const product = await db.product.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: {
            inventory: {
              select: {
                id: true, quantity: true, reserved: true, lowStockThreshold: true, warehouseId: true,
                warehouse: { select: { name: true, pincode: true, city: true, state: true } },
              },
              orderBy: { quantity: 'desc' as const },
            },
          },
        },
        tags: { include: { tag: true } },
        _count: { select: { reviews: true, orderItems: true } },
      },
    })

    if (!product) return notFound('Product not found')

    return ok({
      ...product,
      basePrice: Number(product.basePrice),
      salePrice: product.salePrice ? Number(product.salePrice) : null,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      variants: product.variants.map(v => ({
        ...v,
        priceDelta: Number(v.priceDelta),
        weight: v.weight ? Number(v.weight) : null,
      })),
    })
  } catch (err) {
    console.error('Portal product GET error:', err)
    return serverError()
  }
}

// ─── PUT: Update product ────────────────────────────────────────

const warehouseEntrySchema = z.object({
  warehouseName: z.string().min(1),
  pincode:       z.string().length(6),
  quantity:      z.number().int().min(0).default(0),
})

const variantUpsertSchema = z.object({
  id:         z.string().optional(),
  sku:        z.string().min(1),
  name:       z.string().optional(),
  size:       z.string().optional(),
  color:      z.string().optional(),
  colorHex:   z.string().optional(),
  priceDelta: z.number().default(0),
  weight:     z.number().optional(),
  sortOrder:  z.number().default(0),
  isActive:   z.boolean().default(true),
  warehouses: z.array(warehouseEntrySchema).default([]),
})

const updateSchema = z.object({
  name:             z.string().min(1).max(255).optional(),
  description:      z.string().optional(),
  shortDescription: z.string().optional(),
  brand:            z.string().optional(),
  categoryId:       z.string().nullable().optional(),
  basePrice:        z.number().min(0).optional(),
  salePrice:        z.number().min(0).nullable().optional(),
  costPrice:        z.number().min(0).nullable().optional(),
  isActive:         z.boolean().optional(),
  isFeatured:       z.boolean().optional(),
  metaTitle:        z.string().optional(),
  metaDescription:  z.string().optional(),
  variants:         z.array(variantUpsertSchema).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const existing = await db.product.findUnique({
      where: { id: params.id },
      include: { variants: { select: { id: true, sku: true } } },
    })
    if (!existing) return notFound('Product not found')

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid update data', parsed.error.flatten())

    const { variants: variantData, ...productData } = parsed.data

    const updated = await db.$transaction(async (tx) => {
      // Update product fields
      const p = await tx.product.update({
        where: { id: params.id },
        data: productData,
      })

      // Upsert variants if provided
      if (variantData && variantData.length > 0) {
        const incomingIds = variantData.filter(v => v.id).map(v => v.id!)

        // Deactivate variants that are no longer in the list
        const existingIds = existing.variants.map(v => v.id)
        const removedIds = existingIds.filter(id => !incomingIds.includes(id))
        if (removedIds.length > 0) {
          await tx.productVariant.updateMany({
            where: { id: { in: removedIds } },
            data: { isActive: false },
          })
        }

        // Upsert each variant with multi-warehouse inventory
        for (const v of variantData) {
          let variantId: string

          if (v.id && existingIds.includes(v.id)) {
            // Update existing variant
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                sku: v.sku,
                name: v.name,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                priceDelta: v.priceDelta,
                weight: v.weight,
                sortOrder: v.sortOrder,
                isActive: v.isActive,
              },
            })
            variantId = v.id
          } else {
            // Create new variant
            const variant = await tx.productVariant.create({
              data: {
                productId: params.id,
                sku: v.sku,
                name: v.name,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                priceDelta: v.priceDelta,
                weight: v.weight,
                sortOrder: v.sortOrder,
                isActive: v.isActive,
              },
            })
            variantId = variant.id
          }

          // Sync multi-warehouse inventory: delete old rows, create fresh ones
          await tx.inventory.deleteMany({ where: { variantId } })
          if (v.warehouses.length > 0) {
            for (const wh of v.warehouses) {
              if (wh.warehouseName && wh.pincode) {
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
            // Fallback: create a default zero-stock row
            await tx.inventory.create({
              data: { variantId, quantity: 0, warehouseId: null },
            })
          }
        }
      }

      return p
    })

    // Audit with before/after
    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.updated',
      resourceType: 'Product',
      resourceId: params.id,
      payload: {
        before: {
          name: existing.name,
          basePrice: Number(existing.basePrice),
          isActive: existing.isActive,
          variantCount: existing.variants.length,
        },
        after: {
          name: updated.name,
          basePrice: Number(updated.basePrice),
          isActive: updated.isActive,
          variantCount: variantData?.length,
        },
      },
    })

    // Invalidate caches
    await invalidateCmsCache([
      { key: CACHE_KEYS.product(existing.slug), revalidatePaths: [`/product/${existing.slug}`], broadcastEvent: 'product-updated' },
      { key: CACHE_KEYS.homepage, revalidatePaths: ['/'] },
    ])

    return ok({ id: updated.id, slug: updated.slug })
  } catch (err) {
    console.error('Portal product PUT error:', err)
    return serverError()
  }
}

// ─── DELETE: Soft delete (requires credential elevation) ────────

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.delete')
  if (error) return error

  // Credential elevation required for destructive actions
  const elevated = await requireCredentialElevation(employee!.id)
  if (!elevated) {
    return forbidden('Credential elevation required. Please verify your password first.')
  }

  try {
    const existing = await db.product.findUnique({ where: { id: params.id } })
    if (!existing) return notFound('Product not found')

    // Soft delete — never hard delete products
    await db.product.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.deleted',
      resourceType: 'Product',
      resourceId: params.id,
      payload: { before: { name: existing.name, slug: existing.slug } },
    })

    await invalidateCmsCache([
      { key: CACHE_KEYS.product(existing.slug), revalidatePaths: [`/product/${existing.slug}`], broadcastEvent: 'product-deleted' },
      { key: CACHE_KEYS.homepage, revalidatePaths: ['/'] },
    ])

    return ok({ success: true })
  } catch (err) {
    console.error('Portal product DELETE error:', err)
    return serverError()
  }
}
