export const runtime = 'nodejs'

import { ok, unauthorized } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { verifyEmployeeRefreshToken } from '@/lib/employee-jwt'
import jwt from 'jsonwebtoken'

export async function POST() {
  try {
    // 1. Read refresh token from HttpOnly cookie
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('employee_refresh_token')?.value
    if (!refreshToken) return unauthorized('No refresh token')

    // 2. Verify with EMPLOYEE_REFRESH_SECRET
    const payload = verifyEmployeeRefreshToken(refreshToken)

    // 3. Generate new access token only
    const accessToken = jwt.sign(
      { employeeId: payload.employeeId, role: payload.role, type: 'employee_access' },
      process.env.JWT_EMPLOYEE_ACCESS_SECRET!,
      { expiresIn: '1h' }
    )

    // 4. Set new access token cookie
    cookieStore.set('employee_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    })

    return ok({ accessToken })
  } catch {
    return unauthorized('Invalid or expired refresh token')
  }
}
