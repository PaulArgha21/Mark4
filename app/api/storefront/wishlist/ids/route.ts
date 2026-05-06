export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'

export async function GET(request: Request) {
  try {
    const { user } = await requireCustomerAuth(request)
    if (!user) return ok([])

    const wishlist = await db.wishlist.findUnique({
      where: { userId: user.id },
      include: { items: { select: { productId: true } } },
    })

    return ok(wishlist?.items.map(i => i.productId) ?? [])
  } catch (err) {
    console.error('Wishlist IDs error:', err)
    return serverError()
  }
}
