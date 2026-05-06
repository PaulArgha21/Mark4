export const runtime = 'nodejs'

import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { sendEmail, generateOTP, otpEmailTemplate } from '@/lib/email'
import { employeeLoginLimiter, getClientIp } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const { success: rateLimitOk } = await employeeLoginLimiter.limit(ip)
    if (!rateLimitOk) {
      return badRequest('Too many attempts. Please try again later.')
    }

    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid email', parsed.error.flatten())

    const { email } = parsed.data

    // Check if employee exists and is active
    const employee = await db.employee.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!employee) {
      return unauthorized('No active employee account found with this email')
    }

    // Check lockout
    const lockoutKey = `employee:lockout:${email}`
    const isLockedOut = await redis.get(lockoutKey)
    if (isLockedOut) {
      return badRequest('Account temporarily locked. Try again in 15 minutes.')
    }

    // Generate OTP and hash it
    const otp = generateOTP()
    const otpHash = await bcrypt.hash(otp, 10)

    // Store OTP in DB (expires in 5 minutes)
    await db.emailOTP.create({
      data: {
        email,
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    })

    // Also store in Redis for quick verification (5 min TTL)
    await redis.set(`otp:employee:${email}`, otpHash, { ex: 300 })

    // Send OTP email
    await sendEmail({
      to: email,
      subject: 'Your Aprdite Portal Login Code',
      html: otpEmailTemplate(otp),
    })

    return ok({
      message: 'OTP sent to your email',
      email,
      name: employee.name,
    })
  } catch (err) {
    console.error('Send OTP error:', err)
    return serverError()
  }
}
