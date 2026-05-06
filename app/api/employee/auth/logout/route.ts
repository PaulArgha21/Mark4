export const runtime = 'nodejs'

import { ok, unauthorized } from '@/lib/api-response'
import { cookies } from 'next/headers'
import { verifyEmployeeToken } from '@/lib/employee-jwt'
import { db } from '@/lib/db'
import { logAuditEntry } from '@/lib/audit'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  try {
    const token = cookieStore.get('employee_access_token')?.value

    // Invalidate session in DB if token present
    if (token) {
      try {
        const payload = verifyEmployeeToken(token)
        await db.employeeSession.deleteMany({
          where: { employeeId: payload.employeeId, token },
        })
        await logAuditEntry({
          employeeId: payload.employeeId,
          role: payload.role,
          action: 'employee.logout',
        })
      } catch {
        // Token might be expired, still clear cookies
      }
    }

    // Clear cookies
    cookieStore.delete('employee_access_token')
    cookieStore.delete('employee_refresh_token')

    return ok({ success: true })
  } catch {
    cookieStore.delete('employee_access_token')
    cookieStore.delete('employee_refresh_token')
    return ok({ success: true })
  }
}
