export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requirePermission(request, 'collections.manage')
  if (error) return error

  try {
    const collection = await db.collection.findUnique({
      where: { id: params.id },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: { id: true, name: true, slug: true, brand: true, basePrice: true, salePrice: true, isActive: true,
                media: { where: { isPrimary: true }, take: 1, select: { url: true } } },
            },
          },
        },
      },
    })
    if (!collection) return notFound()
    return ok(collection)
  } catch (err) {
    console.error('[cms/collections/id] GET:', err)
    return serverError()
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'collections.manage')
  if (error || !employee) return error!

  try {
    const existing = await db.collection.findUnique({ where: { id: params.id } })
    if (!existing) return notFound()

    const body = await request.json()
    const { productIds, ...data } = body as { productIds?: string[]; [key: string]: unknown }

    const updated = await db.collection.update({
      where: { id: params.id },
      data: Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
    })

    if (productIds !== undefined) {
      await db.collectionProduct.deleteMany({ where: { collectionId: params.id } })
      if (productIds.length > 0) {
        await db.collectionProduct.createMany({
          data: productIds.map((pid: string, i: number) => ({
            collectionId: params.id,
            productId: pid,
            sortOrder: i,
          })),
        })
      }
    }

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.collection.updated', resourceType: 'Collection', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok(updated)
  } catch (err) {
    console.error('[cms/collections/id] PUT:', err)
    return serverError()
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error, employee } = await requirePermission(request, 'collections.manage')
  if (error || !employee) return error!

  try {
    await db.collection.delete({ where: { id: params.id } })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.collection.deleted', resourceType: 'Collection', resourceId: params.id,
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return ok({ deleted: true })
  } catch (err) {
    console.error('[cms/collections/id] DELETE:', err)
    return serverError()
  }
}
