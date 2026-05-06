export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, badRequest, notFound, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const updateSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().min(4).optional(),
  isDefault: z.boolean().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const { id } = await params
    const existing = await db.address.findFirst({ where: { id, userId: user.id } })
    if (!existing) return notFound('Address not found')

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const data = parsed.data

    if (data.isDefault) {
      await db.address.updateMany({
        where: { userId: user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const address = await db.address.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.addressLine1 && { addressLine1: data.addressLine1 }),
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
        ...(data.city && { city: data.city }),
        ...(data.state && { state: data.state }),
        ...(data.pincode && { pincode: data.pincode }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    })

    return ok({
      id: address.id, label: address.label, fullName: address.fullName,
      phone: address.phone, line1: address.addressLine1, line2: address.addressLine2,
      city: address.city, state: address.state, postalCode: address.pincode,
      country: address.country, isDefault: address.isDefault,
    })
  } catch (err) {
    console.error('Address PUT error:', err)
    return serverError()
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const { id } = await params
    const existing = await db.address.findFirst({ where: { id, userId: user.id } })
    if (!existing) return notFound('Address not found')

    await db.address.delete({ where: { id } })

    // If deleted address was default, make the most recent one default
    if (existing.isDefault) {
      const next = await db.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })
      if (next) {
        await db.address.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    }

    return ok({ success: true })
  } catch (err) {
    console.error('Address DELETE error:', err)
    return serverError()
  }
}
