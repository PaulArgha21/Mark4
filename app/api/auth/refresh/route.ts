export const runtime = 'nodejs'

import { ok, unauthorized, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { verifyCustomerRefreshToken } from '@/lib/customer-jwt'
import jwt from 'jsonwebtoken'

export async function POST() {
  try {
    // 1. Read refresh token from HttpOnly cookie
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value
    if (!refreshToken) return unauthorized('No refresh token')

    // 2. Verify with REFRESH_SECRET
    const payload = verifyCustomerRefreshToken(refreshToken)

    // 3. Generate new access token only (refresh token stays)
    const accessToken = jwt.sign(
      { userId: payload.userId, type: 'customer_access' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    )

    // 4. Set new access token cookie
    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15,
      path: '/',
    })

    return ok({ accessToken })
  } catch {
    return unauthorized('Invalid or expired refresh token')
  }
}
