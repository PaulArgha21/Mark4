export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, serverError } from '@/lib/api-response'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const listQuery = z.object({
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(100).default(30),
  search:     z.string().optional(),
  action:     z.string().optional(),
  employeeId: z.string().optional(),
})

export async function GET(request: Request) {
  const { error } = await requirePermission(request, 'audit.view')
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, search, action, employeeId } = listQuery.parse(
      Object.fromEntries(searchParams)
    )

    const where: Prisma.EmployeeAuditLogWhereInput = {}
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (employeeId) where.employeeId = employeeId
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { employee: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      db.employeeAuditLog.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      db.employeeAuditLog.count({ where }),
    ])

    const items = logs.map(l => ({
      id: l.id,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      payload: l.payload,
      ipAddress: l.ipAddress,
      employeeName: l.employee?.name ?? l.employee?.email ?? 'Unknown',
      role: l.role,
      createdAt: l.performedAt.toISOString(),
    }))

    return ok({
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('Portal audit GET error:', err)
    return serverError()
  }
}
