export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1),
  phone: z.string().min(5),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(4),
  isDefault: z.boolean().optional(),
})

export async function GET(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return ok(addresses.map(a => ({
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.addressLine1,
      line2: a.addressLine2,
      city: a.city,
      state: a.state,
      postalCode: a.pincode,
      country: a.country,
      isDefault: a.isDefault,
    })))
  } catch (err) {
    console.error('Addresses GET error:', err)
    return serverError()
  }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const body = await request.json()
    const parsed = addressSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid address', parsed.error.flatten())

    const data = parsed.data

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    // If first address, make it default
    const count = await db.address.count({ where: { userId: user.id } })

    const address = await db.address.create({
      data: {
        userId: user.id,
        label: data.label,
        fullName: data.fullName,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        isDefault: data.isDefault ?? count === 0,
      },
    })

    return ok({
      id: address.id,
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.addressLine1,
      line2: address.addressLine2,
      city: address.city,
      state: address.state,
      postalCode: address.pincode,
      country: address.country,
      isDefault: address.isDefault,
    })
  } catch (err) {
    console.error('Addresses POST error:', err)
    return serverError()
  }
}
