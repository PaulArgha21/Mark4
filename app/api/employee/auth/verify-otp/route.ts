export const runtime = 'nodejs'

import { ok, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { generateEmployeeTokenPair } from '@/lib/employee-jwt'
import { logAuditEntry } from '@/lib/audit'
import { getClientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())

    const { email, otp } = parsed.data

    // Check lockout
    const lockoutKey = `employee:lockout:${email}`
    const isLockedOut = await redis.get(lockoutKey)
    if (isLockedOut) {
      return forbidden('Account temporarily locked. Try again in 15 minutes.')
    }

    // Find the latest OTP for this email
    const otpRecord = await db.emailOTP.findFirst({
      where: {
        email,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return unauthorized('OTP expired or not found. Please request a new one.')
    }

    // Too many attempts on this OTP
    if (otpRecord.attempts >= 5) {
      await redis.set(lockoutKey, '1', { ex: 900 })
      return forbidden('Too many failed attempts. Account locked for 15 minutes.')
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpRecord.otpHash)

    if (!isValid) {
      // Increment attempts
      await db.emailOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      })

      const failureKey = `employee:otp_failures:${email}`
      const failures = await redis.incr(failureKey)
      await redis.expire(failureKey, 900)

      if (failures >= 5) {
        await redis.set(lockoutKey, '1', { ex: 900 })
      }

      return unauthorized('Invalid OTP')
    }

    // OTP is valid — clean up
    await db.emailOTP.deleteMany({ where: { email } })
    await redis.del(`otp:employee:${email}`)
    await redis.del(`employee:otp_failures:${email}`)

    // Find employee
    const employee = await db.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
    })

    if (!employee) {
      return unauthorized('Employee account not found')
    }

    // Update lastLoginAt
    await db.employee.update({
      where: { id: employee.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate tokens
    const { accessToken, refreshToken } = generateEmployeeTokenPair(employee.id, employee.role)

    // Create session
    const sessionExpiry = new Date(Date.now() + 8 * 60 * 60 * 1000)
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

    // Set HttpOnly cookies
    const cookieStore = await cookies()
    cookieStore.set('employee_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })
    cookieStore.set('employee_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    // Audit log
    await logAuditEntry({
      employeeId: employee.id,
      role: employee.role,
      action: 'employee.login.otp',
      ipAddress: ip,
    })

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
    console.error('Verify OTP error:', err)
    return serverError()
  }
}
