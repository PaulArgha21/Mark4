import { EmployeeRole } from '@prisma/client'
import { db } from './db'
import { redis } from './redis'
import { unauthorized, forbidden } from './api-response'
import { verifyEmployeeToken } from './employee-jwt'

// Permission matrix keyed by role
const ROLE_PERMISSIONS: Record<EmployeeRole, string[]> = {
  SUPERADMIN: ['*'], // wildcard — all permissions
  ADMIN: [
    'employees.view','audit_logs.view','products.create','products.edit',
    'products.delete','products.view','categories.manage','collections.manage',
    'inventory.view','inventory.update','inventory.adjust','suppliers.manage',
    'purchase_orders.manage','orders.view_all','orders.update_status','orders.cancel',
    'refunds.view','refunds.process','customers.view','customers.block',
    'finance.revenue','finance.export','finance.gst','cms.banners','cms.homepage',
    'cms.collections','cms.blog','cms.stories','reviews.moderate',
    'coupons.create','coupons.delete','promotions.manage','flash_sales.manage',
    'bundles.manage','analytics.full','analytics.marketing','analytics.ops','analytics.offers',
    'plugins.manage','audit.view','settings.manage','support.manage',
  ],
  MARKETING: [
    'products.view','categories.manage','collections.manage',
    'cms.banners','cms.homepage','cms.collections','cms.blog','cms.stories',
    'reviews.moderate','coupons.create','promotions.manage','analytics.marketing',
  ],
  FINANCE: [
    'orders.view_all','refunds.view','refunds.process',
    'finance.revenue','finance.export','finance.gst',
    'purchase_orders.manage','customers.view','analytics.full','analytics.offers',
  ],
  OPERATIONS: [
    'products.view','products.create','products.edit',
    'inventory.view','inventory.update','inventory.adjust',
    'suppliers.manage','purchase_orders.manage',
    'orders.view_all','orders.update_status','orders.cancel',
    'customers.view','analytics.ops','support.manage',
  ],
  OFFERS: [
    'products.view','coupons.create','coupons.delete',
    'promotions.manage','flash_sales.manage','bundles.manage','analytics.offers',
  ],
}

export function hasPermission(role: EmployeeRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.includes(permission)
}

// ── Middleware-style wrappers ────────────────────────────────────

export async function requireEmployeeAuth(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? (request.headers.get('cookie')?.match(/employee_access_token=([^;]+)/)?.[1])
  if (!token) return { error: unauthorized(), employee: null }

  try {
    const payload = verifyEmployeeToken(token)
    const employee = await db.employee.findUnique({
      where: { id: payload.employeeId, isActive: true }
    })
    if (!employee) return { error: unauthorized(), employee: null }
    return { error: null, employee }
  } catch {
    return { error: unauthorized(), employee: null }
  }
}

export async function requirePermission(request: Request, permission: string) {
  const { error, employee } = await requireEmployeeAuth(request)
  if (error || !employee) return { error: error ?? unauthorized(), employee: null }
  if (!hasPermission(employee.role, permission)) return { error: forbidden(), employee: null }
  return { error: null, employee }
}

export async function requireCredentialElevation(employeeId: string): Promise<boolean> {
  const key = `credential:elevated:${employeeId}`
  const elevated = await redis.get(key)
  return Boolean(elevated)
}
