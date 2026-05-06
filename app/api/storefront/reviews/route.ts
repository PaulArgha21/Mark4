export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, unauthorized, badRequest, conflict, serverError } from '@/lib/api-response'
import { requireCustomerAuth } from '@/lib/middleware-utils'
import { z } from 'zod'

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  comment: z.string().max(2000).optional(),
})

export async function POST(request: Request) {
  try {
    const { error, user } = await requireCustomerAuth(request)
    if (error || !user) return error ?? unauthorized()

    const body = await request.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid review', parsed.error.flatten())

    const { productId, rating, title, comment } = parsed.data

    // Check product exists
    const product = await db.product.findUnique({ where: { id: productId, isActive: true } })
    if (!product) return badRequest('Product not found')

    // Check if user already reviewed
    const existing = await db.review.findUnique({
      where: { productId_userId: { productId, userId: user.id } },
    })
    if (existing) return conflict('You have already reviewed this product')

    // Create review
    const review = await db.review.create({
      data: {
        productId,
        userId: user.id,
        rating,
        title,
        comment,
        isApproved: true, // auto-approve for now
      },
    })

    // Update product rating stats
    const stats = await db.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    })

    await db.product.update({
      where: { id: productId },
      data: {
        averageRating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating,
      },
    })

    return ok({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.comment,
      createdAt: review.createdAt.toISOString(),
      user: { name: user.name },
    })
  } catch (err) {
    console.error('Review POST error:', err)
    return serverError()
  }
}
