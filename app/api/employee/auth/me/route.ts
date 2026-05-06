export const runtime = 'nodejs'

import { ok, unauthorized } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { verifyEmployeeToken } from '@/lib/employee-jwt'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    // 1. Extract token from header or cookie
    const headerToken = request.headers.get('authorization')?.replace('Bearer ', '')
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get('employee_access_token')?.value
    const token = headerToken || cookieToken
    if (!token) return unauthorized()

    // 2. Verify JWT
    const payload = verifyEmployeeToken(token)

    // 3. Fetch employee from DB
    const employee = await db.employee.findFirst({
      where: { id: payload.employeeId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!employee) return unauthorized()

    return ok(employee)
  } catch {
    return unauthorized('Invalid or expired token')
  }
}
