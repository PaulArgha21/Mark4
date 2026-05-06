export const runtime = 'nodejs'

import { ok, unauthorized, badRequest, forbidden, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { generateCustomerTokenPair } from '@/lib/customer-jwt'
import { authLoginLimiter, getClientIp } from '@/lib/rate-limit'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: Request) {
  try {
    // 1. Rate limit: 5 req/min per IP
    const ip = getClientIp(request)
    const { success: rateLimitOk } = await authLoginLimiter.limit(ip)
    if (!rateLimitOk) {
      return badRequest('Too many login attempts. Please try again later.')
    }

    // 2. Parse body
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid credentials', parsed.error.flatten())

    const { identifier, password } = parsed.data

    // 3. Find user by email or phone
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    })

    // 4. If not found → generic 401
    if (!user || !user.passwordHash) {
      return unauthorized('Invalid email/phone or password')
    }

    // 5. Compare password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return unauthorized('Invalid email/phone or password')
    }

    // 6. Check if blocked
    if (user.isBlocked) {
      return forbidden('Your account has been suspended. Please contact support.')
    }

    // 7. Generate token pair
    const { accessToken, refreshToken } = generateCustomerTokenPair(user.id)

    // 8. Set HttpOnly cookies
    const cookieStore = await cookies()
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/',
    })

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    // 9. Return safe user fields + accessToken
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
    console.error('Login error:', err)
    return serverError()
  }
}
