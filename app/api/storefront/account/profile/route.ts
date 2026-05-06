export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
})

export async function PUT(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      },
      select: { id: true, name: true, email: true, phone: true },
    })

    return ok(updated)
  } catch (err) {
    console.error('Profile update error:', err)
    return serverError()
  }
}
