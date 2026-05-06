export const runtime = 'nodejs'

import { ok, unauthorized, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { verifyCustomerToken } from '@/lib/customer-jwt'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    // 1. Extract token from Authorization header or cookie
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get('access_token')?.value
    const token = headerToken || cookieToken
    if (!token) return unauthorized()

    // 2. Verify JWT
    const payload = verifyCustomerToken(token)

    // 3. Fetch user from DB (omit passwordHash)
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) return unauthorized()

    return ok(user)
  } catch {
    return unauthorized('Invalid or expired token')
  }
}
