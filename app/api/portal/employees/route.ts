export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission, requireCredentialElevation } from '@/lib/permissions'
import { ok, created, badRequest, forbidden, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'
import { EmployeeRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'

/* ── LIST ── */
const listQuery = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role:   z.string().optional(),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
})

export async function GET(request: Request) {
  const { error, employee } = await requirePermission(request, 'employees.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, search, role, status } = listQuery.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.EmployeeWhereInput = {}
    if (status === 'active') where.isActive = true
    if (status === 'inactive') where.isActive = false
    if (role) where.role = role as EmployeeRole
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * limit

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          isActive: true,
          twoFaEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { auditLogs: true } },
        },
      }),
      db.employee.count({ where }),
    ])

    const items = employees.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      role: e.role,
      avatar: e.avatar,
      isActive: e.isActive,
      twoFaEnabled: e.twoFaEnabled,
      lastLoginAt: e.lastLoginAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      auditCount: e._count.auditLogs,
    }))

    return ok({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err) {
    console.error('Employees GET error:', err)
    return serverError()
  }
}

/* ── CREATE (invite) ── */
const createSchema = z.object({
  name:     z.string().min(1).max(100),
  email:    z.string().email(),
  role:     z.nativeEnum(EmployeeRole),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request) {
  const { error, employee } = await requirePermission(request, 'employees.view')
  if (error) return error

  // Only SUPERADMIN can create employees
  if (employee!.role !== 'SUPERADMIN') return forbidden('Only SUPERADMIN can create employees')

  // Require credential elevation for creating employees
  const elevated = await requireCredentialElevation(employee!.id)
  if (!elevated) return forbidden('Credential elevation required. Please re-verify your password.')

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const { name, email, role, password } = parsed.data

    // Check uniqueness
    const existing = await db.employee.findUnique({ where: { email } })
    if (existing) return badRequest('An employee with this email already exists')

    // Cannot create SUPERADMIN
    if (role === 'SUPERADMIN' && employee!.role !== 'SUPERADMIN') {
      return forbidden('Cannot assign SUPERADMIN role')
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const newEmployee = await db.employee.create({
      data: { name, email, role, passwordHash },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'employee.created',
      resourceType: 'Employee',
      resourceId: newEmployee.id,
      payload: { context: { name, email, role } },
    })

    return created(newEmployee)
  } catch (err) {
    console.error('Employee create error:', err)
    return serverError()
  }
}
