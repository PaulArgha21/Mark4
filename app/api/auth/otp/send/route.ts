export const runtime = 'nodejs'

import { ok, badRequest, serverError, notFound } from '@/lib/api-response'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Valid 10-digit phone number required'),
})

function customerOtpEmailTemplate(otp: string, name: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0;">Aprdite</h1>
        <p style="color: #666; font-size: 14px; margin-top: 4px;">Your Fashion Destination</p>
      </div>
      <div style="background: #fdf2f4; border-radius: 12px; padding: 32px; text-align: center;">
        <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hi ${name || 'there'},</p>
        <p style="color: #555; font-size: 14px; margin: 0 0 20px;">Use the code below to sign in to your account:</p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #d6336c; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px; margin: 16px 0 0;">This code expires in 5 minutes. Do not share it with anyone.</p>
      </div>
      <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 24px;">
        If you didn't request this code, please ignore this email.
      </p>
    </div>
  `
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid phone number', parsed.error.flatten())

    const { phone } = parsed.data

    // Check if user with this phone exists
    const user = await db.user.findFirst({ where: { phone } })
    if (!user) return notFound('No account found with this phone number')
    if (user.isBlocked) return badRequest('Account suspended. Contact support.')
    if (!user.email) return badRequest('No email linked to this account. Please login with email & password.')

    // Rate limit: max 3 OTP requests per phone per 10 min
    const rateLimitKey = `otp:rate:${phone}`
    const attempts = await redis.incr(rateLimitKey)
    if (attempts === 1) await redis.expire(rateLimitKey, 600)
    if (attempts > 3) return badRequest('Too many OTP requests. Try again in a few minutes.')

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))

    // Store OTP in Redis with 5 min TTL
    await redis.set(`otp:${phone}`, otp, { ex: 300 })

    // Send OTP to user's registered email
    const maskedEmail = user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    try {
      await sendEmail({
        to: user.email,
        subject: 'Your Aprdite Login Code',
        html: customerOtpEmailTemplate(otp, user.name || ''),
      })
    } catch (emailErr) {
      console.error('Email send failed, logging OTP for dev:', emailErr)
      console.log(`[OTP] ${phone}: ${otp}`)
    }

    return ok({
      message: `OTP sent to ${maskedEmail}`,
      maskedEmail,
      expiresIn: 300,
    })
  } catch (err) {
    console.error('OTP send error:', err)
    return serverError()
  }
}
