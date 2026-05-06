export const runtime = 'nodejs'

import { ok, badRequest, conflict, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { generateCustomerTokenPair } from '@/lib/customer-jwt'
import { authRegisterLimiter, getClientIp } from '@/lib/rate-limit'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  try {
    // 1. Rate limit: 3 req/min per IP
    const ip = getClientIp(request)
    const { success: rateLimitOk } = await authRegisterLimiter.limit(ip)
    if (!rateLimitOk) {
      return badRequest('Too many requests. Please try again later.')
    }

    // 2. Parse & validate body
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return badRequest('Validation failed', parsed.error.flatten())

    const { name, email, phone, password } = parsed.data

    // 3. Check email uniqueness
    const existingUser = await db.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    })
    if (existingUser) {
      return conflict('An account with this email or phone already exists')
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // 5. Create user + loyalty account in transaction
    const user = await db.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: 'CUSTOMER',
        loyaltyAccount: {
          create: { tier: 'BRONZE' },
        },
      },
      select: { id: true, name: true, email: true, phone: true, role: true, image: true },
    })

    // 6. Generate JWT token pair
    const { accessToken, refreshToken } = generateCustomerTokenPair(user.id)

    // 7. Set HttpOnly cookies
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

    // 8. Return user + accessToken
    return ok({ user, accessToken })
  } catch (err) {
    console.error('Register error:', err)
    return serverError()
  }
}
