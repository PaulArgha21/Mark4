export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const querySchema = z.object({
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(100).default(30),
  search:     z.string().optional(),
  filter:     z.enum(['all', 'low_stock', 'out_of_stock', 'overstocked']).default('all'),
  sort:       z.enum(['sku', 'quantity_asc', 'quantity_desc', 'product', 'updated']).default('updated'),
  warehouseId:z.string().optional(),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'inventory.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, search, filter, sort, warehouseId } = querySchema.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.InventoryWhereInput = {}
    if (warehouseId) where.warehouseId = warehouseId

    // Stock level filters
    if (filter === 'low_stock') {
      // Low stock: quantity > 0 but at or below default threshold
      where.AND = [{ quantity: { gt: 0 } }, { quantity: { lte: 5 } }]
    } else if (filter === 'out_of_stock') {
      where.quantity = { lte: 0 }
    } else if (filter === 'overstocked') {
      where.quantity = { gte: 100 }
    }

    // Search
    if (search) {
      where.variant = {
        OR: [
          { sku: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }
    }

    const orderBy: Prisma.InventoryOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'sku':           return { variant: { sku: 'asc' as const } }
        case 'quantity_asc':  return { quantity: 'asc' as const }
        case 'quantity_desc': return { quantity: 'desc' as const }
        case 'product':       return { variant: { product: { name: 'asc' as const } } }
        default:              return { updatedAt: 'desc' as const }
      }
    })()

    const skip = (page - 1) * limit

    const [inventory, total, summary] = await Promise.all([
      db.inventory.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          variant: {
            select: {
              id: true, sku: true, size: true, color: true, colorHex: true, isActive: true, priceDelta: true,
              product: { select: { id: true, name: true, slug: true, brand: true, basePrice: true, salePrice: true, costPrice: true } },
            },
          },
          warehouse: { select: { id: true, name: true, code: true, pincode: true, city: true, state: true } },
        },
      }),
      db.inventory.count({ where }),
      // Dashboard summary
      Promise.all([
        db.inventory.count(),
        db.inventory.count({ where: { quantity: { lte: 0 } } }),
        db.inventory.count({ where: { AND: [{ quantity: { gt: 0 } }, { quantity: { lte: 5 } }] } }),
        db.inventory.aggregate({ _sum: { quantity: true, reserved: true } }),
        db.purchaseOrder.count({ where: { status: { in: ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'] } } }),
        db.supplier.count({ where: { isActive: true } }),
      ]),
    ])

    const items = inventory.map(inv => {
      const bp = Number(inv.variant.product.basePrice)
      const sp = inv.variant.product.salePrice ? Number(inv.variant.product.salePrice) : null
      const effectiveBase = sp || bp
      const variantPrice = effectiveBase + Number(inv.variant.priceDelta || 0)
      return {
        id: inv.id,
        variantId: inv.variantId,
        sku: inv.variant.sku,
        productId: inv.variant.product.id,
        productName: inv.variant.product.name,
        productSlug: inv.variant.product.slug,
        brand: inv.variant.product.brand,
        size: inv.variant.size,
        color: inv.variant.color,
        colorHex: inv.variant.colorHex,
        quantity: inv.quantity,
        reserved: inv.reserved,
        available: Math.max(0, inv.quantity - inv.reserved),
        lowStockThreshold: inv.lowStockThreshold,
        isLowStock: inv.quantity > 0 && inv.quantity <= inv.lowStockThreshold,
        isOutOfStock: inv.quantity <= 0,
        variantPrice,
        compareAtPrice: sp ? bp : null,
        costPrice: inv.variant.product.costPrice ? Number(inv.variant.product.costPrice) : null,
        warehouseId: inv.warehouseId,
        warehouseName: inv.warehouse?.name || null,
        warehousePincode: inv.warehouse?.pincode || null,
        warehouseCity: inv.warehouse?.city || null,
        updatedAt: inv.updatedAt.toISOString(),
      }
    })

    const [totalSKUs, outOfStock, lowStock, stockAgg, pendingPOs, activeSuppliers] = summary

    return ok({
      items,
      summary: {
        totalSKUs,
        outOfStock,
        lowStock,
        totalQuantity: stockAgg._sum.quantity ?? 0,
        totalReserved: stockAgg._sum.reserved ?? 0,
        pendingPurchaseOrders: pendingPOs,
        activeSuppliers,
      },
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Inventory list error:', err)
    return serverError()
  }
}
