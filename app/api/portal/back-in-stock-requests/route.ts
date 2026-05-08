export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const { error, employee } = await requirePermission(request, 'inventory.view')
    if (error || !employee) return error!

    const sp = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20')))
    const notifiedOnly = sp.get('notified') === 'true'
    const pendingOnly = sp.get('pending') === 'true'

    const where = {
      ...(notifiedOnly ? { notified: true } : {}),
      ...(pendingOnly ? { notified: false } : {}),
    }

    const [items, total] = await Promise.all([
      db.backInStockRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.backInStockRequest.count({ where }),
    ])

    // Enrich with variant + product info
    const variantIds = Array.from(new Set(items.map(i => i.variantId)))
    const variants = await db.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { select: { name: true } }, inventory: { select: { quantity: true } } },
    })
    const variantMap = new Map(variants.map(v => [v.id, v]))

    const enriched = items.map(i => {
      const v = variantMap.get(i.variantId)
      return {
        ...i,
        productName: v?.product?.name ?? 'Unknown',
        sku: v?.sku ?? '',
        variantName: [v?.color, v?.size].filter(Boolean).join(' / '),
        currentStock: v?.inventory?.reduce((s: number, inv: { quantity: number }) => s + inv.quantity, 0) ?? 0,
      }
    })

    return ok({
      items: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[portal/back-in-stock-requests] Error:', err)
    return serverError('Failed to load requests')
  }
}
