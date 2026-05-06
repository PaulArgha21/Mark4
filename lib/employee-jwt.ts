import jwt from 'jsonwebtoken'
import { EmployeeRole } from '@prisma/client'

const ACCESS_SECRET  = process.env.JWT_EMPLOYEE_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_EMPLOYEE_REFRESH_SECRET!

export function generateEmployeeTokenPair(employeeId: string, role: EmployeeRole) {
  const accessToken = jwt.sign(
    { employeeId, role, type: 'employee_access' },
    ACCESS_SECRET,
    { expiresIn: '1h' }
  )
  const refreshToken = jwt.sign(
    { employeeId, role, type: 'employee_refresh' },
    REFRESH_SECRET,
    { expiresIn: '8h' }
  )
  return { accessToken, refreshToken }
}

export function verifyEmployeeToken(token: string): { employeeId: string; role: EmployeeRole } {
  return jwt.verify(token, ACCESS_SECRET) as { employeeId: string; role: EmployeeRole }
}

export function verifyEmployeeRefreshToken(token: string): { employeeId: string; role: EmployeeRole } {
  return jwt.verify(token, REFRESH_SECRET) as { employeeId: string; role: EmployeeRole }
}
