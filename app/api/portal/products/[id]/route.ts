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
            inventory: { select: { quantity: true, reserved: true, lowStockThreshold: true } },
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
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const existing = await db.product.findUnique({ where: { id: params.id } })
    if (!existing) return notFound('Product not found')

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid update data', parsed.error.flatten())

    const updated = await db.product.update({
      where: { id: params.id },
      data: parsed.data,
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
        },
        after: {
          name: updated.name,
          basePrice: Number(updated.basePrice),
          isActive: updated.isActive,
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
