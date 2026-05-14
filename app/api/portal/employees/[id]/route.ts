export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission, requireCredentialElevation } from '@/lib/permissions'
import { ok, notFound, badRequest, forbidden, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { z } from 'zod'
import { EmployeeRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

/* ── GET single employee ── */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'employees.view')
  if (error) return error

  try {
    const emp = await db.employee.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, role: true, avatar: true,
        isActive: true, twoFaEnabled: true, lastLoginAt: true, createdAt: true, updatedAt: true,
        _count: { select: { auditLogs: true, sessions: true } },
      },
    })
    if (!emp) return notFound('Employee not found')

    return ok({
      ...emp,
      lastLoginAt: emp.lastLoginAt?.toISOString() ?? null,
      createdAt: emp.createdAt.toISOString(),
      updatedAt: emp.updatedAt.toISOString(),
      auditCount: emp._count.auditLogs,
      activeSessions: emp._count.sessions,
    })
  } catch (err) {
    console.error('Employee GET error:', err)
    return serverError()
  }
}

/* ── UPDATE employee ── */
const updateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  role:        z.nativeEnum(EmployeeRole).optional(),
  isActive:    z.boolean().optional(),
  newPassword: z.string().min(8).max(128).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'employees.view')
  if (error) return error

  // Only SUPERADMIN can edit employees
  if (employee!.role !== 'SUPERADMIN') return forbidden('Only SUPERADMIN can modify employees')

  const elevated = await requireCredentialElevation(employee!.id)
  if (!elevated) return forbidden('Credential elevation required. Please re-verify your password.')

  try {
    const target = await db.employee.findUnique({ where: { id: params.id } })
    if (!target) return notFound('Employee not found')

    // Cannot edit another SUPERADMIN unless you are the same person
    if (target.role === 'SUPERADMIN' && target.id !== employee!.id) {
      return forbidden('Cannot modify another SUPERADMIN account')
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.flatten())

    const data: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.role !== undefined) data.role = parsed.data.role
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive
    if (parsed.data.newPassword) {
      data.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    }

    if (Object.keys(data).length === 0) return badRequest('No fields to update')

    const updated = await db.employee.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    // If deactivated, kill all sessions
    if (parsed.data.isActive === false) {
      await db.employeeSession.deleteMany({ where: { employeeId: params.id } })
    }

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: parsed.data.isActive === false ? 'employee.deactivated' : 'employee.updated',
      resourceType: 'Employee',
      resourceId: params.id,
      payload: {
        before: { name: target.name, role: target.role, isActive: target.isActive },
        after: data,
      },
    })

    return ok(updated)
  } catch (err) {
    console.error('Employee update error:', err)
    return serverError()
  }
}

/* ── DELETE (soft deactivate) ── */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, employee } = await requirePermission(request, 'employees.view')
  if (error) return error

  if (employee!.role !== 'SUPERADMIN') return forbidden('Only SUPERADMIN can deactivate employees')

  const elevated = await requireCredentialElevation(employee!.id)
  if (!elevated) return forbidden('Credential elevation required.')

  try {
    const target = await db.employee.findUnique({ where: { id: params.id } })
    if (!target) return notFound('Employee not found')

    // Cannot delete yourself or another SUPERADMIN
    if (target.id === employee!.id) return badRequest('Cannot deactivate your own account')
    if (target.role === 'SUPERADMIN') return forbidden('Cannot deactivate a SUPERADMIN account')

    await db.$transaction([
      db.employee.update({ where: { id: params.id }, data: { isActive: false } }),
      db.employeeSession.deleteMany({ where: { employeeId: params.id } }),
    ])

    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'employee.deactivated',
      resourceType: 'Employee',
      resourceId: params.id,
      payload: { context: { name: target.name, email: target.email, role: target.role } },
    })

    return ok({ success: true })
  } catch (err) {
    console.error('Employee delete error:', err)
    return serverError()
  }
}
