export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission, requireCredentialElevation } from '@/lib/permissions'
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// ─── GET: List flash sales ──────────────────────────────────────

const listQuery = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['upcoming', 'active', 'ended', 'all']).default('all'),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'offers.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, status } = listQuery.parse(Object.fromEntries(searchParams))

    const now = new Date()
    const where: Prisma.FlashSaleWhereInput = {}

    if (status === 'upcoming') {
      where.startDate = { gt: now }
      where.isActive = true
    } else if (status === 'active') {
      where.startDate = { lte: now }
      where.endDate = { gte: now }
      where.isActive = true
    } else if (status === 'ended') {
      where.endDate = { lt: now }
    }

    const skip = (page - 1) * limit

    const [sales, total] = await Promise.all([
      db.flashSale.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
        include: {
          products: {
            select: {
              id: true,
              productId: true,
              discountType: true,
              discountValue: true,
              salePrice: true,
              stockLimit: true,
              soldCount: true,
            },
          },
          _count: { select: { products: true } },
        },
      }),
      db.flashSale.count({ where }),
    ])

    const items = sales.map(s => {
      const isLive = s.isActive && s.startDate <= now && s.endDate >= now
      const isUpcoming = s.isActive && s.startDate > now
      const totalSold = s.products.reduce((sum, p) => sum + p.soldCount, 0)
      const totalStock = s.products.reduce((sum, p) => sum + (p.stockLimit ?? 0), 0)

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        bannerImage: s.bannerImage,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        isActive: s.isActive,
        displayCountdown: s.displayCountdown,
        status: isLive ? 'live' : isUpcoming ? 'upcoming' : 'ended',
        productCount: s._count.products,
        totalSold,
        totalStock,
        sellThroughRate: totalStock > 0 ? Math.round((totalSold / totalStock) * 100) : 0,
        products: s.products.map(p => ({
          ...p,
          discountValue: Number(p.discountValue),
          salePrice: Number(p.salePrice),
        })),
        createdAt: s.createdAt.toISOString(),
      }
    })

    return ok({
      items,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Flash sales list error:', err)
    return serverError()
  }
}

// ─── POST: Create flash sale ────────────────────────────────────

const flashProductSchema = z.object({
  productId:     z.string().min(1),
  variantId:     z.string().optional(),
  discountType:  z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().min(0),
  salePrice:     z.number().min(0),
  stockLimit:    z.number().int().min(1).optional(),
  sortOrder:     z.number().int().default(0),
})

const createSchema = z.object({
  name:             z.string().min(1).max(255),
  slug:             z.string().min(1).max(255),
  bannerImage:      z.string().optional(),
  startDate:        z.string().datetime(),
  endDate:          z.string().datetime(),
  displayCountdown: z.boolean().default(true),
  priority:         z.number().int().default(0),
  products:         z.array(flashProductSchema).min(1),
})

export async function POST(request: Request) {
  const { error, employee } = await requirePermission(request, 'flash_sales.manage')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const data = parsed.data
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)

    if (endDate <= startDate) return badRequest('End date must be after start date')

    // Check for high discounts (>= 40%) requiring elevation
    const hasHighDiscount = data.products.some(
      p => p.discountType === 'PERCENTAGE' && p.discountValue >= 40
    )
    if (hasHighDiscount) {
      const elevated = await requireCredentialElevation(employee!.id)
      if (!elevated) {
        return forbidden('Credential elevation required for discounts >= 40%')
      }
    }

    // Check for overlapping flash sales on same products
    const productIds = data.products.map(p => p.productId)
    const overlapping = await db.flashSale.findFirst({
      where: {
        isActive: true,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        products: { some: { productId: { in: productIds } } },
      },
    })
    if (overlapping) {
      return badRequest(`Overlapping flash sale found: "${overlapping.name}"`)
    }

    const flashSale = await db.$transaction(async (tx) => {
      const sale = await tx.flashSale.create({
        data: {
          name: data.name,
          slug: data.slug,
          bannerImage: data.bannerImage,
          startDate,
          endDate,
          displayCountdown: data.displayCountdown,
          priority: data.priority,
          createdById: employee!.id,
        },
      })

      await tx.flashSaleProduct.createMany({
        data: data.products.map(p => ({
          flashSaleId: sale.id,
          productId: p.productId,
          variantId: p.variantId ?? null,
          discountType: p.discountType,
          discountValue: p.discountValue,
          salePrice: p.salePrice,
          stockLimit: p.stockLimit ?? null,
          sortOrder: p.sortOrder,
        })),
      })

      return sale
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'flash_sale.created',
      resourceType: 'FlashSale',
      resourceId: flashSale.id,
      payload: {
        after: {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          productCount: String(data.products.length),
        },
      },
    })

    await invalidateCmsCache([
      { key: CACHE_KEYS.homepage, revalidatePaths: ['/'], broadcastEvent: 'flash-sale-created' },
    ])

    return ok({ id: flashSale.id, slug: flashSale.slug })
  } catch (err) {
    console.error('Flash sale create error:', err)
    return serverError()
  }
}
