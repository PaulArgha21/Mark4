const RESEND_API_KEY = process.env.RESEND_API_KEY!
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@aprdite.com'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Resend email error:', err)
    throw new Error('Failed to send email')
  }

  return res.json()
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function otpEmailTemplate(otp: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0;">Aprdite</h1>
        <p style="color: #666; font-size: 14px; margin-top: 4px;">Employee Portal</p>
      </div>
      <div style="background: #f8f8f8; border-radius: 12px; padding: 32px; text-align: center;">
        <p style="color: #333; font-size: 16px; margin: 0 0 16px;">Your login verification code is:</p>
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
