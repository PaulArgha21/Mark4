import { db } from './db'
import { unauthorized } from './api-response'
import { verifyCustomerToken, verifyCustomerRefreshToken, generateCustomerTokenPair } from './customer-jwt'
import { cookies } from 'next/headers'

// ── Customer Auth Middleware Helper ─────────────────────────────

export async function requireCustomerAuth(request: Request) {
  const cookieStore = await cookies()
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? cookieStore.get('access_token')?.value
    ?? (request.headers.get('cookie')?.match(/access_token=([^;]+)/)?.[1])

  // Try access token first
  if (token) {
    try {
      const payload = verifyCustomerToken(token)
      const user = await db.user.findUnique({
        where: { id: payload.userId }
      })
      if (!user) return { error: unauthorized(), user: null }
      if (user.isBlocked) return { error: unauthorized('Account is blocked'), user: null }
      return { error: null, user }
    } catch {
      // Access token invalid/expired — fall through to refresh
    }
  }

  // Try refresh token to get a new access token
  const refreshToken = cookieStore.get('refresh_token')?.value
  if (refreshToken) {
    try {
      const payload = verifyCustomerRefreshToken(refreshToken)
      const user = await db.user.findUnique({
        where: { id: payload.userId }
      })
      if (!user) return { error: unauthorized(), user: null }
      if (user.isBlocked) return { error: unauthorized('Account is blocked'), user: null }

      // Generate new access token and set cookie
      const { accessToken } = generateCustomerTokenPair(user.id)
      cookieStore.set('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15,
        path: '/',
      })

      return { error: null, user }
    } catch {
      return { error: unauthorized(), user: null }
    }
  }

  return { error: unauthorized(), user: null }
}
