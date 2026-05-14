'use client'
import useSWR from 'swr'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LogOut } from 'lucide-react'
import { AprditeLogoIcon } from '@/components/shared/AprditeLogo'
import type { EmployeeRole } from '@/lib/types'

interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_BY_ROLE: Record<EmployeeRole, NavItem[]> = {
  SUPERADMIN: [
    { label: 'Dashboard',   href: '/admin/dashboard',           icon: '📊' },
    { label: 'Products',    href: '/admin/dashboard/products',  icon: '👗' },
    { label: 'Orders',      href: '/admin/dashboard/orders',    icon: '📦' },
    { label: 'CMS',         href: '/admin/cms',                 icon: '🎨' },
    { label: 'Finance',     href: '/admin/finance',             icon: '💰' },
    { label: 'Inventory',   href: '/admin/inventory',           icon: '🏭' },
    { label: 'Shipping',    href: '/admin/shipping',            icon: '🚚' },
    { label: 'Offers',      href: '/admin/offers',              icon: '🏷️' },
    { label: 'Customers',   href: '/admin/dashboard/customers', icon: '👥' },
    { label: 'Employees',   href: '/admin/dashboard/employees', icon: '🧑‍💼' },
    { label: 'Audit Logs',  href: '/admin/dashboard/audit',     icon: '📋' },
    { label: 'Plugins',     href: '/admin/plugins',             icon: '🔌' },
    { label: 'ML Engine',   href: '/admin/dashboard/ml',        icon: '🧠' },
    { label: 'Support',     href: '/admin/dashboard/support',   icon: '🎧' },
    { label: 'Settings',    href: '/admin/dashboard/settings',  icon: '⚙️' },
  ],
  ADMIN: [
    { label: 'Dashboard',   href: '/admin/dashboard',           icon: '📊' },
    { label: 'Products',    href: '/admin/dashboard/products',  icon: '👗' },
    { label: 'Orders',      href: '/admin/dashboard/orders',    icon: '📦' },
    { label: 'CMS',         href: '/admin/cms',                 icon: '🎨' },
    { label: 'Finance',     href: '/admin/finance',             icon: '💰' },
    { label: 'Inventory',   href: '/admin/inventory',           icon: '🏭' },
    { label: 'Shipping',    href: '/admin/shipping',            icon: '🚚' },
    { label: 'Offers',      href: '/admin/offers',              icon: '🏷️' },
    { label: 'Customers',   href: '/admin/dashboard/customers', icon: '👥' },
    { label: 'Audit Logs',  href: '/admin/dashboard/audit',     icon: '📋' },
    { label: 'Plugins',     href: '/admin/plugins',             icon: '🔌' },
    { label: 'ML Engine',   href: '/admin/dashboard/ml',        icon: '🧠' },
    { label: 'Support',     href: '/admin/dashboard/support',   icon: '🎧' },
  ],
  MARKETING: [
    { label: 'CMS Home',          href: '/admin/cms',              icon: '🎨' },
    { label: 'Storefront Builder', href: '/admin/cms/builder',     icon: '🏗️' },
    { label: 'Hero Banners',      href: '/admin/cms/banners',      icon: '🖼️' },
    { label: 'Collections',       href: '/admin/cms/collections',  icon: '🗂️' },
    { label: 'Stories',           href: '/admin/cms/stories',      icon: '📸' },
    { label: 'Gallery',           href: '/admin/cms/gallery',      icon: '🎨' },
    { label: 'Blog',              href: '/admin/cms/blog',         icon: '✍️' },
    { label: 'Reviews',           href: '/admin/cms/reviews',      icon: '⭐' },
    { label: 'Promotions',        href: '/admin/offers',           icon: '🎯' },
  ],
  FINANCE: [
    { label: 'Finance Home', href: '/admin/finance',          icon: '💰' },
    { label: 'Revenue',      href: '/admin/finance/revenue',  icon: '📊' },
    { label: 'Refunds',      href: '/admin/finance/refunds',  icon: '↩️' },
    { label: 'Export',        href: '/admin/finance/export',   icon: '📤' },
  ],
  OPERATIONS: [
    { label: 'Inventory Home',   href: '/admin/inventory',                icon: '📦' },
    { label: 'Stock Management', href: '/admin/inventory/stock',          icon: '📋' },
    { label: 'Suppliers',        href: '/admin/inventory/suppliers',      icon: '🏭' },
    { label: 'Purchase Orders',  href: '/admin/inventory/purchase-orders',icon: '📥' },
    { label: 'Support',         href: '/admin/dashboard/support',        icon: '🎧' },
  ],
  OFFERS: [
    { label: 'Offers Home', href: '/admin/offers',              icon: '🏷️' },
    { label: 'Coupons',     href: '/admin/offers/coupons',      icon: '🎟️' },
    { label: 'Flash Sales',  href: '/admin/offers/flash-sales', icon: '⚡' },
    { label: 'Bundles',     href: '/admin/offers/bundles',      icon: '📦' },
  ],
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export function PortalSidebar() {
  const pathname = usePathname()
  const { data: employee } = useSWR('/api/employee/auth/me', fetcher)
  const navItems = employee?.role ? NAV_BY_ROLE[employee.role as EmployeeRole] ?? [] : []

  return (
    <aside
      className="w-64 flex-shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ background: 'var(--portal-bg)', borderRight: '1px solid var(--portal-border)' }}
    >
      {/* Logo */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--portal-border)' }}>
        <div className="flex items-center gap-2">
          <AprditeLogoIcon size={30} />
          <span className="font-display text-xl font-bold" style={{ color: 'var(--portal-text)' }}>
            Aprdite
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--portal-muted)' }}>Employee Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[var(--portal-accent)]'
                    : 'text-[var(--portal-muted)] hover:text-[var(--portal-text)]'
                )}
                style={isActive ? { background: 'rgba(214,51,108,0.1)' } : undefined}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Employee info */}
      {employee && (
        <div className="px-4 py-4" style={{ borderTop: '1px solid var(--portal-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'rgba(214,51,108,0.2)', color: 'var(--portal-accent)' }}
            >
              {employee.name?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--portal-text)' }}>
                {employee.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                {employee.role}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/employee/auth/logout', { method: 'POST', credentials: 'include' })
                } catch { /* still redirect */ }
                document.cookie = 'employee_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                document.cookie = 'employee_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
                window.location.href = '/admin/login'
              }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: 'var(--portal-muted)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
