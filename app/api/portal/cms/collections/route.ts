export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, badRequest, conflict, serverError, created } from '@/lib/api-response'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'collections.manage')
  if (error) return error

  try {
    const sp = request.nextUrl.searchParams
    const includeProducts = sp.get('products') === 'true'

    const collections = await db.collection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        products: includeProducts ? {
          include: { product: { select: { id: true, name: true, slug: true, basePrice: true, salePrice: true, media: { where: { isPrimary: true }, take: 1, select: { url: true } } } } },
          orderBy: { sortOrder: 'asc' },
        } : { select: { id: true } },
        _count: { select: { products: true } },
      },
    })

    return ok(collections.map(c => ({
      ...c,
      productCount: c._count.products,
      _count: undefined,
    })))
  } catch (err) {
    console.error('[cms/collections] GET:', err)
    return serverError()
  }
}

const collectionSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  bannerThumbnail: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  productIds: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const { error, employee } = await requirePermission(request, 'collections.manage')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const parsed = collectionSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid collection data', parsed.error.flatten())

    const existing = await db.collection.findUnique({ where: { slug: parsed.data.slug } })
    if (existing) return conflict('Collection with this slug already exists')

    const { productIds, ...data } = parsed.data

    const collection = await db.collection.create({ data })

    if (productIds && productIds.length > 0) {
      await db.collectionProduct.createMany({
        data: productIds.map((pid, i) => ({
          collectionId: collection.id,
          productId: pid,
          sortOrder: i,
        })),
      })
    }

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.collection.created', resourceType: 'Collection', resourceId: collection.id,
      payload: { context: { name: collection.name, productCount: productIds?.length ?? 0 } },
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return created(collection)
  } catch (err) {
    console.error('[cms/collections] POST:', err)
    return serverError()
  }
}
