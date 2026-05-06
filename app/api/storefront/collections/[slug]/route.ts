export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const collection = await db.collection.findUnique({
      where: { slug: params.slug, isActive: true },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              select: {
                id: true, name: true, slug: true, brand: true,
                basePrice: true, salePrice: true, averageRating: true, reviewCount: true,
                isActive: true,
                media: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
                category: { select: { name: true, slug: true } },
                variants: { where: { isActive: true }, select: { size: true } },
              },
            },
          },
        },
      },
    })

    if (!collection) return notFound('Collection not found')

    return ok({
      ...collection,
      products: collection.products
        .filter(cp => cp.product.isActive)
        .map(cp => ({
          ...cp.product,
          image: cp.product.media[0]?.url ?? null,
          isFeatured: cp.isFeatured,
          availableSizes: Array.from(new Set(cp.product.variants.map(v => v.size).filter(Boolean))) as string[],
        })),
    })
  } catch (err) {
    console.error('[storefront/collections/slug] GET:', err)
    return serverError()
  }
}
