export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const addSchema = z.object({
  productId: z.string().min(1),
})

export async function GET(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    // Find or create wishlist + items
    const wishlist = await db.wishlist.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
      include: {
        items: { orderBy: { addedAt: 'desc' } },
      },
    })

    if (wishlist.items.length === 0) return ok([])

    // Batch-fetch products (WishlistItem has no product relation)
    const productIds = wishlist.items.map(i => i.productId)
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true, slug: true, name: true, brand: true,
        basePrice: true, salePrice: true, averageRating: true,
        media: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    })
    const productMap = new Map(products.map(p => [p.id, p]))

    const items = wishlist.items
      .filter(item => productMap.has(item.productId))
      .map(item => {
        const p = productMap.get(item.productId)!
        return {
          id: item.id,
          product: {
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            image: p.media[0]?.url ?? '',
            basePrice: Number(p.basePrice),
            salePrice: p.salePrice ? Number(p.salePrice) : null,
            averageRating: p.averageRating,
          },
          addedAt: item.addedAt.toISOString(),
        }
      })

    return ok(items)
  } catch (err) {
    console.error('Wishlist GET error:', err)
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const body = await request.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid request')

    const { productId } = parsed.data

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId, isActive: true } })
    if (!product) return badRequest('Product not found')

    // Upsert wishlist
    const wishlist = await db.wishlist.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    })

    // Toggle: check if item already exists
    const existing = await db.wishlistItem.findUnique({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    })

    if (existing) {
      await db.wishlistItem.delete({ where: { id: existing.id } })
      return ok({ wishlisted: false, productId })
    }

    await db.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId },
    })

    return ok({ wishlisted: true, productId })
  } catch (err) {
    console.error('Wishlist POST error:', err)
    return serverError()
  }
}
