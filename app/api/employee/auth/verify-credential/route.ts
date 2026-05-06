export const runtime = 'nodejs'

import { ok, unauthorized, forbidden, badRequest, serverError } from '@/lib/api-response'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { verifyEmployeeToken } from '@/lib/employee-jwt'

export async function POST(request: Request) {
  try {
    // 1. Require employee auth
    const cookieStore = await cookies()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
      ?? cookieStore.get('employee_access_token')?.value
    if (!token) return unauthorized()

    const payload = verifyEmployeeToken(token)
    const employee = await db.employee.findFirst({
      where: { id: payload.employeeId, isActive: true },
    })
    if (!employee) return unauthorized()

    // 2. Parse body
    const body = await request.json()
    if (!body.password) return badRequest('Password is required')

    // 3. Verify password against employee.passwordHash
    const passwordMatch = await bcrypt.compare(body.password, employee.passwordHash)
    if (!passwordMatch) {
      return forbidden('Incorrect password')
    }

    // 4. Set credential elevation in Redis for 5 minutes
    const elevationKey = `credential:elevated:${employee.id}`
    await redis.set(elevationKey, '1', { ex: 300 })

    // 5. Update EmployeeSession.elevatedUntil
    const elevatedUntil = new Date(Date.now() + 5 * 60 * 1000)
    await db.employeeSession.updateMany({
      where: { employeeId: employee.id, token },
      data: { elevatedUntil },
    })

    return ok({ elevated: true, expiresAt: elevatedUntil.toISOString() })
  } catch {
    return unauthorized('Invalid or expired token')
  }
}
