export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'

export async function GET(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const [orderCount, wishlistCount, addressCount] = await Promise.all([
      db.order.count({ where: { userId: user.id } }),
      db.wishlistItem.count({
        where: { wishlist: { userId: user.id } },
      }),
      db.address.count({ where: { userId: user.id } }),
    ])

    return ok({
      orders: orderCount,
      wishlist: wishlistCount,
      addresses: addressCount,
      memberSince: user.createdAt.toISOString(),
    })
  } catch (err) {
    console.error('Account stats error:', err)
    return serverError()
  }
}
