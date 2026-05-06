export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, badRequest, conflict, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
})

const deleteSchema = z.object({
  itemId: z.string().min(1),
})

async function getOrCreateCart(userId: string | null, sessionId: string | null, cookieStore: Awaited<ReturnType<typeof cookies>>) {
  if (userId) {
    return db.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    })
  }
  let sid = sessionId
  if (!sid) {
    sid = nanoid()
    cookieStore.set('cart_session', sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }
  return db.cart.upsert({
    where: { sessionId: sid },
    create: { sessionId: sid },
    update: {},
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid request', parsed.error.flatten())

    const { variantId, quantity } = parsed.data

    // 1. Check inventory
    const variant = await db.productVariant.findUnique({
      where: { id: variantId, isActive: true },
      include: { inventory: { select: { quantity: true, reserved: true } } },
    })

    if (!variant) return badRequest('Variant not found')

    const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reserved ?? 0)
    if (available < quantity) {
      return conflict('Insufficient stock. Only ' + available + ' available.')
    }

    // 2. Get or create cart
    const { user } = await requireCustomerAuth(request)
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('cart_session')?.value
    const cart = await getOrCreateCart(user?.id ?? null, sessionId ?? null, cookieStore)

    // 3. Upsert cart item
    await db.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: { increment: quantity } },
    })

    return ok({ success: true, variantId, quantity })
  } catch (err) {
    console.error('Cart add error:', err)
    return serverError()
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid request')

    const { itemId } = parsed.data

    await db.cartItem.delete({ where: { id: itemId } }).catch(() => {
      // Item may already be deleted
    })

    return ok({ success: true })
  } catch (err) {
    console.error('Cart delete error:', err)
    return serverError()
  }
}
