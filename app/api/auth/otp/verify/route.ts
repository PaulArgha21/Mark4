export const runtime = 'nodejs'

import { ok, badRequest, serverError } from '@/lib/api-response'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { generateCustomerTokenPair } from '@/lib/customer-jwt'
import { cookies } from 'next/headers'
import { z } from 'zod'

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Valid 10-digit phone number required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())

    const { phone, otp } = parsed.data

    // Verify OTP from Redis
    const storedOtp = await redis.get(`otp:${phone}`)
    if (!storedOtp) return badRequest('OTP expired. Please request a new one.')
    if (storedOtp !== otp) {
      // Track failed attempts
      const failKey = `otp:fail:${phone}`
      const fails = await redis.incr(failKey)
      if (fails === 1) await redis.expire(failKey, 300)
      if (fails >= 5) {
        await redis.del(`otp:${phone}`)
        return badRequest('Too many failed attempts. Request a new OTP.')
      }
      return badRequest('Invalid OTP. Please try again.')
    }

    // OTP valid — clean up
    await redis.del(`otp:${phone}`)
    await redis.del(`otp:fail:${phone}`)

    // Find user
    const user = await db.user.findFirst({ where: { phone } })
    if (!user) return badRequest('Account not found')
    if (user.isBlocked) return badRequest('Account suspended')

    // Generate tokens
    const { accessToken, refreshToken } = generateCustomerTokenPair(user.id)

    // Set cookies
    const cookieStore = await cookies()
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    })
    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        role: user.role,
      },
      accessToken,
    })
  } catch (err) {
    console.error('OTP verify error:', err)
    return serverError()
  }
}
