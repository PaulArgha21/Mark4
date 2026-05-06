export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { z } from 'zod'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error!

    const body = await request.json()
    const parsed = subscriptionSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid subscription data', parsed.error.flatten())

    // Upsert push subscription
    await db.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      update: {
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
      create: {
        userId: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
      },
    })

    // Update UserPreferences with push subscription data
    await db.userPreferences.upsert({
      where: { userId: user.id },
      update: { pushSubscription: parsed.data },
      create: {
        userId: user.id,
        pushSubscription: parsed.data,
      },
    })

    return ok({ subscribed: true })
  } catch (err) {
    console.error('[notifications/subscribe] Error:', err)
    return serverError('Subscription failed')
  }
}
