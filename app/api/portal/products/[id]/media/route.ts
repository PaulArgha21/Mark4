export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, notFound, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'

const mediaSchema = z.object({
  media: z.array(z.object({
    url: z.string().url(),
    altText: z.string().optional(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().default(0),
    type: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  })).min(1),
})

const syncSchema = z.object({
  // context: 'product' | 'description' | 'variant'
  context: z.enum(['product', 'description', 'variant']).default('product'),
  variantId: z.string().optional(),
  media: z.array(z.object({
    id: z.string().optional(), // existing DB id
    url: z.string().url(),
    altText: z.string().optional(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().default(0),
    type: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  })),
})

// POST: Add media to a product
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const product = await db.product.findUnique({ where: { id: params.id } })
    if (!product) return notFound('Product not found')

    const body = await request.json()
    const parsed = mediaSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid media data', parsed.error.flatten())

    const { media } = parsed.data

    // If any is marked primary, unset existing primary first
    if (media.some(m => m.isPrimary)) {
      await db.mediaAsset.updateMany({
        where: { productId: params.id, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    // Create media assets
    const created = await db.$transaction(
      media.map((m, i) => db.mediaAsset.create({
        data: {
          productId: params.id,
          url: m.url,
          altText: m.altText || product.name,
          type: m.type,
          isPrimary: m.isPrimary,
          sortOrder: m.sortOrder ?? i,
        },
      }))
    )

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.media_added',
      resourceType: 'Product',
      resourceId: params.id,
      payload: { context: { count: created.length } },
    })

    return ok({ count: created.length, ids: created.map(m => m.id) })
  } catch (err) {
    console.error('Product media POST error:', err)
    return serverError()
  }
}

// GET: List media for a product
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requirePermission(request, 'products.view')
  if (error) return error

  try {
    const media = await db.mediaAsset.findMany({
      where: { productId: params.id },
      orderBy: { sortOrder: 'asc' },
    })
    return ok(media)
  } catch (err) {
    console.error('Product media GET error:', err)
    return serverError()
  }
}

// DELETE: Remove a specific media asset
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')
    if (!mediaId) return badRequest('mediaId query param required')

    const asset = await db.mediaAsset.findFirst({
      where: { id: mediaId, productId: params.id },
    })
    if (!asset) return notFound('Media asset not found')

    await db.mediaAsset.delete({ where: { id: mediaId } })

    // If deleted was primary, make the first remaining one primary
    if (asset.isPrimary) {
      const first = await db.mediaAsset.findFirst({
        where: { productId: params.id },
        orderBy: { sortOrder: 'asc' },
      })
      if (first) {
        await db.mediaAsset.update({ where: { id: first.id }, data: { isPrimary: true } })
      }
    }

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.media_removed',
      resourceType: 'Product',
      resourceId: params.id,
      payload: { context: { mediaId, url: asset.url } },
    })

    return ok({ success: true })
  } catch (err) {
    console.error('Product media DELETE error:', err)
    return serverError()
  }
}

// PATCH: Purge stale/untagged orphan media records for this product
// Deletes records where altText is NOT one of the context tags — these are leftover from the old POST-only upload flow
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const CONTEXT_TAGS = ['__product__', '__description__', '__variant__']
    const result = await db.mediaAsset.deleteMany({
      where: {
        productId: params.id,
        NOT: { altText: { in: CONTEXT_TAGS } },
      },
    })

    if (result.count > 0) {
      logAuditEntry({
        employeeId: employee!.id,
        role: employee!.role,
        action: 'product.media_stale_purged',
        resourceType: 'Product',
        resourceId: params.id,
        payload: { context: { purgedCount: result.count } },
      })
    }

    return ok({ purged: result.count })
  } catch (err) {
    console.error('Product media PATCH (cleanup) error:', err)
    return serverError()
  }
}

// PUT: Full upsert-based media sync for a context (product/description/variant)
// Deletes assets removed from the list, upserts existing, creates new
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const product = await db.product.findUnique({ where: { id: params.id } })
    if (!product) return notFound('Product not found')

    const body = await request.json()
    const parsed = syncSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid media sync data', parsed.error.flatten())

    const { context, variantId, media } = parsed.data
    const contextTag = `__${context}__`

    // Fetch existing assets for this context
    const whereClause: any = { productId: params.id, altText: contextTag }
    if (context === 'variant' && variantId) {
      whereClause.variantId = variantId
    }

    const existing = await db.mediaAsset.findMany({ where: whereClause })
    const existingIds = new Set(existing.map(a => a.id))
    const incomingIds = new Set(media.filter(m => m.id).map(m => m.id!))

    // Delete removed assets
    const toDelete = Array.from(existingIds).filter(id => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await db.mediaAsset.deleteMany({ where: { id: { in: toDelete } } })
    }

    const results: string[] = []
    for (const m of media) {
      if (m.id && existingIds.has(m.id)) {
        // Update existing
        await db.mediaAsset.update({
          where: { id: m.id },
          data: { url: m.url, isPrimary: m.isPrimary, sortOrder: m.sortOrder, type: m.type },
        })
        results.push(m.id)
      } else {
        // Create new
        const created = await db.mediaAsset.create({
          data: {
            productId: params.id,
            variantId: context === 'variant' ? variantId : undefined,
            url: m.url,
            altText: contextTag,
            type: m.type,
            isPrimary: m.isPrimary,
            sortOrder: m.sortOrder,
          },
        })
        results.push(created.id)
      }
    }

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.media_synced',
      resourceType: 'Product',
      resourceId: params.id,
      payload: { context: { mediaContext: context, count: media.length } },
    })

    // Return IDs so client can track them
    const allMedia = await db.mediaAsset.findMany({
      where: whereClause,
      orderBy: { sortOrder: 'asc' },
    })
    return ok({ synced: results.length, deleted: toDelete.length, media: allMedia })
  } catch (err) {
    console.error('Product media PUT error:', err)
    return serverError()
  }
}
