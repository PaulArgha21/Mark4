export const runtime = 'nodejs'

import { ok, unauthorized, badRequest, forbidden, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { generateEmployeeTokenPair } from '@/lib/employee-jwt'
import { employeeLoginLimiter, getClientIp } from '@/lib/rate-limit'
import { logAuditEntry } from '@/lib/audit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    // 1. Rate limit: 5 req/15min per IP
    const ip = getClientIp(request)
    const { success: rateLimitOk } = await employeeLoginLimiter.limit(ip)
    if (!rateLimitOk) {
      return badRequest('Too many login attempts. Please try again later.')
    }

    // 2. Parse body
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid credentials', parsed.error.flatten())

    const { email, password } = parsed.data

    // 3. Check lockout
    const lockoutKey = `employee:lockout:${email}`
    const isLockedOut = await redis.get(lockoutKey)
    if (isLockedOut) {
      return forbidden('Account temporarily locked. Try again in 15 minutes.')
    }

    // 4. Find employee
    const employee = await db.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
    })

    if (!employee) {
      return unauthorized('Invalid credentials')
    }

    // 5. Compare password
    const passwordMatch = await bcrypt.compare(password, employee.passwordHash)

    if (!passwordMatch) {
      // 6. Increment failure counter
      const failureKey = `employee:failures:${email}`
      const failures = await redis.incr(failureKey)
      await redis.expire(failureKey, 900) // 15 minutes TTL

      // 7. Lockout after 5 failures
      if (failures >= 5) {
        await redis.set(lockoutKey, '1', { ex: 900 })
      }

      return unauthorized('Invalid credentials')
    }

    // 8. Success: reset failure counter
    await redis.del(`employee:failures:${email}`)

    // 9. Update lastLoginAt
    await db.employee.update({
      where: { id: employee.id },
      data: { lastLoginAt: new Date() },
    })

    // 10. Generate employee token pair
    const { accessToken, refreshToken } = generateEmployeeTokenPair(employee.id, employee.role)

    // 11. Create employee session in DB
    const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
    await db.employeeSession.create({
      data: {
        employeeId: employee.id,
        token: accessToken,
        refreshToken,
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') ?? undefined,
        expiresAt: sessionExpiry,
      },
    })

    // 12. Set HttpOnly cookies
    const cookieStore = await cookies()
    cookieStore.set('employee_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })

    cookieStore.set('employee_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    // 13. Audit log
    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'employee.login',
      ipAddress: ip,
    })

    // 14. Return safe fields
    return ok({
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        avatar: employee.avatar,
      },
      accessToken,
    })
  } catch (err) {
    console.error('Employee login error:', err)
    return serverError()
  }
}
