export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const { id } = await params

    await db.wishlistItem.delete({ where: { id } }).catch(() => {})

    return ok({ success: true })
  } catch (err) {
    console.error('Wishlist delete error:', err)
    return serverError()
  }
}
