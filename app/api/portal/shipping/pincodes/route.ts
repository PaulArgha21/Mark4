export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'
import { z } from 'zod'

// GET /api/portal/shipping/pincodes — Search/list pincodes
export async function GET(request: Request) {
  try {
    const { error } = await requirePermission(request, 'settings.manage')
    if (error) return error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q') || ''
    const zoneId = searchParams.get('zoneId') || undefined
    const state = searchParams.get('state') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { pincode: { contains: search } },
        { city: { contains: search, mode: 'insensitive' } },
        { district: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (zoneId) where.zoneId = zoneId
    if (state) where.state = state

    const [pincodes, total] = await Promise.all([
      db.pincodeEntry.findMany({
        where: where as never,
        include: { zone: { select: { id: true, name: true, type: true } } },
        orderBy: { pincode: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.pincodeEntry.count({ where: where as never }),
    ])

    // Distinct states for filter
    const states = await db.pincodeEntry.findMany({
      select: { state: true },
      distinct: ['state'],
      orderBy: { state: 'asc' },
    })

    return ok({
      pincodes,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      states: states.map((s: { state: string }) => s.state),
    })
  } catch (err) {
    console.error('Pincodes GET error:', err)
    return serverError()
  }
}

const pincodeSchema = z.object({
  pincode: z.string().length(6),
  city: z.string().min(1),
  district: z.string().optional(),
  state: z.string().min(1),
  stateCode: z.string().optional(),
  zoneId: z.string().min(1),
  isServiceable: z.boolean().optional(),
  isCODAvailable: z.boolean().optional(),
  deliveryNote: z.string().optional(),
})

// POST /api/portal/shipping/pincodes — Add a pincode entry
export async function POST(request: Request) {
  try {
    const { error } = await requirePermission(request, 'settings.manage')
    if (error) return error

    const body = await request.json()
    const parsed = pincodeSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid pincode data', parsed.error.flatten())

    const entry = await db.pincodeEntry.upsert({
      where: { pincode: parsed.data.pincode },
      update: parsed.data,
      create: parsed.data,
    })

    return ok(entry)
  } catch (err) {
    console.error('Pincodes POST error:', err)
    return serverError()
  }
}
