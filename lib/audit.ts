import { db } from './db'
import { EmployeeRole } from '@prisma/client'

interface AuditEntry {
  employeeId: string
  role: EmployeeRole
  action: string
  resourceType?: string
  resourceId?: string
  payload?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    context?: Record<string, unknown>
  }
  ipAddress?: string
}

export async function logAuditEntry(entry: AuditEntry): Promise<void> {
  // Fire and forget — never let audit failures block the response
  db.employeeAuditLog.create({
    data: {
      employeeId:   entry.employeeId,
      role:         entry.role,
      action:       entry.action,
      resourceType: entry.resourceType,
      resourceId:   entry.resourceId,
      payload:      entry.payload as object,
      ipAddress:    entry.ipAddress,
      performedAt:  new Date(),
    }
  }).catch(console.error)
}
