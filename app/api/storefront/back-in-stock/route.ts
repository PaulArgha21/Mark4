export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, badRequest, conflict, serverError } from '@/lib/api-response'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  variantId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    // Verify variant exists
    const variant = await db.productVariant.findUnique({
      where: { id: parsed.data.variantId },
      include: { inventory: true },
    })
    if (!variant) return badRequest('Variant not found')

    // Check if already in stock
    if (variant.inventory && variant.inventory.quantity > 0) {
      return ok({ message: 'Item is currently in stock', inStock: true })
    }

    // Try to extract userId from auth cookie (optional)
    let userId: string | undefined
    try {
      const token = request.headers.get('authorization')?.replace('Bearer ', '')
        ?? request.headers.get('cookie')?.match(/access_token=([^;]+)/)?.[1]
      if (token) {
        const { verifyCustomerToken } = await import('@/lib/customer-jwt')
        const payload = verifyCustomerToken(token)
        userId = payload.userId
      }
    } catch {
      // Not authenticated — that's fine
    }

    // Upsert back-in-stock request
    const existing = await db.backInStockRequest.findUnique({
      where: { email_variantId: { email: parsed.data.email, variantId: parsed.data.variantId } },
    })

    if (existing && !existing.notified) {
      return conflict('Already subscribed for this item')
    }

    await db.backInStockRequest.upsert({
      where: { email_variantId: { email: parsed.data.email, variantId: parsed.data.variantId } },
      update: { notified: false, notifiedAt: null, userId },
      create: {
        email: parsed.data.email,
        variantId: parsed.data.variantId,
        userId,
      },
    })

    return ok({ subscribed: true, message: 'You will be notified when this item is back in stock' })
  } catch (err) {
    console.error('[storefront/back-in-stock] Error:', err)
    return serverError('Subscription failed')
  }
}
