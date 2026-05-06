export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const checkoutSchema = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(['UPI', 'CARD', 'COD']),
  notes: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const body = await request.json()
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid checkout data', parsed.error.flatten())

    const { addressId, paymentMethod, notes } = parsed.data

    // 1. Verify address belongs to user
    const address = await db.address.findFirst({ where: { id: addressId, userId: user.id } })
    if (!address) return badRequest('Address not found')

    // 2. Get cart with items
    const cart = await db.cart.findFirst({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, basePrice: true, salePrice: true } },
                inventory: true,
              },
            },
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return badRequest('Cart is empty')
    }

    // 3. Verify stock and calculate totals
    const orderItems: { productId: string; variantId: string; quantity: number; unitPrice: number; totalPrice: number }[] = []
    let subtotal = 0

    for (const item of cart.items) {
      const available = (item.variant.inventory?.quantity ?? 0) - (item.variant.inventory?.reserved ?? 0)
      if (available < item.quantity) {
        return badRequest(`Insufficient stock for ${item.variant.product.name}`)
      }
      const price = item.variant.product.salePrice
        ? Number(item.variant.product.salePrice)
        : Number(item.variant.product.basePrice)
      const total = price * item.quantity
      subtotal += total
      orderItems.push({
        productId: item.variant.product.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: total,
      })
    }

    const shippingCost = subtotal > 999 ? 0 : 99
    const tax = Math.round(subtotal * 0.18)
    const total = subtotal + shippingCost + tax

    // 4. Create order in a transaction
    const orderNumber = `APR-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`

    const order = await db.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          addressId,
          status: 'PENDING',
          paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
          paymentMethod,
          subtotal,
          shippingCost,
          tax,
          total,
          notes,
          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            line1: address.addressLine1,
            line2: address.addressLine2,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            country: address.country,
          },
          items: {
            create: orderItems,
          },
        },
      })

      // Reserve inventory
      for (const item of cart.items) {
        if (item.variant.inventory) {
          await tx.inventory.update({
            where: { id: item.variant.inventory.id },
            data: { reserved: { increment: item.quantity } },
          })
        }
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

      // Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          status: 'PENDING',
          note: 'Order placed',
        },
      })

      return newOrder
    })

    return ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      status: order.status,
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return serverError()
  }
}
