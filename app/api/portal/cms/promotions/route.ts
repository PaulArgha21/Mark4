export const runtime = 'nodejs'

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { ok, badRequest, serverError, created } from '@/lib/api-response'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(request, 'promotions.manage')
  if (error) return error

  try {
    const sp = request.nextUrl.searchParams
    const activeOnly = sp.get('active') === 'true'
    const now = new Date()

    const where = activeOnly
      ? { isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }
      : {}

    const promotions = await db.promotion.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return ok(promotions)
  } catch (err) {
    console.error('[cms/promotions] GET:', err)
    return serverError()
  }
}

const promotionSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().optional().nullable(),
  type: z.enum(['BUY_X_GET_Y', 'SPEND_X_SAVE_Y', 'FREE_SHIPPING', 'BUNDLE_DEAL']),
  config: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  priority: z.number().default(0),
})

export async function POST(request: NextRequest) {
  const { error, employee } = await requirePermission(request, 'promotions.manage')
  if (error || !employee) return error!

  try {
    const body = await request.json()
    const parsed = promotionSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid promotion data', parsed.error.flatten())

    const promo = await db.promotion.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        config: parsed.data.config as Prisma.InputJsonValue,
        isActive: parsed.data.isActive,
        priority: parsed.data.priority,
        createdById: employee.id,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      },
    })

    await logAuditEntry({
      employeeId: employee.id, role: employee.role,
      action: 'cms.promotion.created', resourceType: 'Promotion', resourceId: promo.id,
      payload: { context: { name: promo.name, type: promo.type } },
    })

    await invalidateCmsCache([{ key: CACHE_KEYS.homepage, revalidatePaths: ['/'] }])
    return created(promo)
  } catch (err) {
    console.error('[cms/promotions] POST:', err)
    return serverError()
  }
}
