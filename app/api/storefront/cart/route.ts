export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    // 1. Get userId from auth or sessionId from cookie
    const { user } = await requireCustomerAuth(request)
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('cart_session')?.value

    if (!user && !sessionId) {
      return ok({ items: [], subtotal: 0, shippingCost: 0, tax: 0, total: 0, coupon: null })
    }

    // 2. Find cart
    const cart = await db.cart.findFirst({
      where: user ? { userId: user.id } : { sessionId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true, name: true, slug: true, brand: true,
                    basePrice: true, salePrice: true,
                    media: { where: { isPrimary: true }, take: 1, select: { url: true } },
                  },
                },
                inventory: { select: { quantity: true, reserved: true } },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return ok({ items: [], subtotal: 0, shippingCost: 0, tax: 0, total: 0, coupon: null })
    }

    // 3. Transform items + compute totals
    const items = cart.items.map(item => {
      const product = item.variant.product
      const price = product.salePrice ? Number(product.salePrice) : Number(product.basePrice)
      const availableQty = Math.max(0, (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reserved ?? 0))

      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          image: product.media[0]?.url ?? '',
          basePrice: Number(product.basePrice),
          salePrice: product.salePrice ? Number(product.salePrice) : null,
        },
        variant: {
          size: item.variant.size,
          color: item.variant.color,
          colorHex: item.variant.colorHex,
          sku: item.variant.sku,
          availableQty,
        },
        lineTotal: price * item.quantity,
      }
    })

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
    const shippingCost = subtotal > 999 ? 0 : 99
    const tax = Math.round(subtotal * 0.18)
    const total = subtotal + shippingCost + tax

    return ok({ items, subtotal, shippingCost, tax, total, coupon: null })
  } catch (err) {
    console.error('Cart GET error:', err)
    return serverError()
  }
}
