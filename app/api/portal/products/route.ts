export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

// ─── GET: Paginated product list ────────────────────────────────

const listQuery = z.object({
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(100).default(20),
  search:     z.string().optional(),
  categoryId: z.string().optional(),
  status:     z.enum(['active', 'inactive', 'all']).default('all'),
  sort:       z.enum(['newest', 'oldest', 'name', 'price_asc', 'price_desc']).default('newest'),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'products.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, search, categoryId, status, sort } = listQuery.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.ProductWhereInput = {}
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = (() => {
      switch (sort) {
        case 'oldest':    return { createdAt: 'asc' as const }
        case 'name':      return { name: 'asc' as const }
        case 'price_asc': return { basePrice: 'asc' as const }
        case 'price_desc':return { basePrice: 'desc' as const }
        default:          return { createdAt: 'desc' as const }
      }
    })()

    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          media: { where: { isPrimary: true }, take: 1, select: { url: true } },
          _count: { select: { variants: true, reviews: true } },
        },
      }),
      db.product.count({ where }),
    ])

    const items = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      basePrice: Number(p.basePrice),
      salePrice: p.salePrice ? Number(p.salePrice) : null,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      image: p.media[0]?.url ?? null,
      category: p.category,
      variantCount: p._count.variants,
      reviewCount: p._count.reviews,
      createdAt: p.createdAt.toISOString(),
    }))

    return ok({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Portal products GET error:', err)
    return serverError()
  }
}

// ─── POST: Create a new product ─────────────────────────────────

const variantSchema = z.object({
  sku:        z.string().min(1),
  name:       z.string().optional(),
  size:       z.string().optional(),
  color:      z.string().optional(),
  colorHex:   z.string().optional(),
  priceDelta: z.number().default(0),
  weight:     z.number().optional(),
  sortOrder:  z.number().default(0),
  quantity:   z.number().int().min(0).default(0),
})

const createSchema = z.object({
  name:             z.string().min(1).max(255),
  description:      z.string().optional(),
  shortDescription: z.string().optional(),
  brand:            z.string().optional(),
  categoryId:       z.string().optional(),
  basePrice:        z.number().min(0),
  salePrice:        z.number().min(0).optional(),
  costPrice:        z.number().min(0).optional(),
  isActive:          z.boolean().default(true),
  isFeatured:       z.boolean().default(false),
  metaTitle:        z.string().optional(),
  metaDescription:  z.string().optional(),
  variants:         z.array(variantSchema).min(1),
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(request: Request) {
  const { error, employee } = await requirePermission(request, 'products.create')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid product data', parsed.error.flatten())

    const data = parsed.data

    // Generate unique slug
    let slug = slugify(data.name)
    const existing = await db.product.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString(36)}`

    // Create product + variants + inventory in transaction
    const product = await db.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          shortDescription: data.shortDescription,
          brand: data.brand,
          categoryId: data.categoryId,
          basePrice: data.basePrice,
          salePrice: data.salePrice,
          costPrice: data.costPrice,
          isActive: data.isActive,
          isFeatured: data.isFeatured,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
        },
      })

      // Create variants + inventory
      for (const v of data.variants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: p.id,
            sku: v.sku,
            name: v.name,
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            priceDelta: v.priceDelta,
            weight: v.weight,
            sortOrder: v.sortOrder,
          },
        })
        await tx.inventory.create({
          data: { variantId: variant.id, quantity: v.quantity },
        })
      }

      return p
    })

    // Audit
    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.created',
      resourceType: 'Product',
      resourceId: product.id,
      payload: { after: { name: data.name, slug } },
    })

    // Invalidate caches
    await invalidateCmsCache([
      { key: CACHE_KEYS.homepage, revalidatePaths: ['/'], broadcastEvent: 'product-created' },
    ])

    return ok({ id: product.id, slug: product.slug })
  } catch (err) {
    console.error('Portal products POST error:', err)
    return serverError()
  }
}
