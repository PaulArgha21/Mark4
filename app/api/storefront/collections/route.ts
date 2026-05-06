export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, serverError } from '@/lib/api-response'

export async function GET() {
  try {
    const collections = await db.collection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, name: true, slug: true, description: true,
        bannerUrl: true, bannerThumbnail: true,
        _count: { select: { products: true } },
      },
    })

    return ok(collections.map(c => ({ ...c, productCount: c._count.products, _count: undefined })))
  } catch (err) {
    console.error('[storefront/collections] GET:', err)
    return serverError()
  }
}
