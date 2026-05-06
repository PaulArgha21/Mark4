export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { z } from 'zod'

const updateSchema = z.object({
  quantity: z.number().int().min(1).max(20),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid quantity')

    const item = await db.cartItem.findUnique({
      where: { id },
      include: { variant: { include: { inventory: true } } },
    })
    if (!item) return badRequest('Cart item not found')

    const available = (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reserved ?? 0)
    if (parsed.data.quantity > available) {
      return badRequest(`Only ${available} available`)
    }

    await db.cartItem.update({
      where: { id },
      data: { quantity: parsed.data.quantity },
    })

    return ok({ success: true })
  } catch (err) {
    console.error('Cart item update error:', err)
    return serverError()
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.cartItem.delete({ where: { id } }).catch(() => {})
    return ok({ success: true })
  } catch (err) {
    console.error('Cart item delete error:', err)
    return serverError()
  }
}
