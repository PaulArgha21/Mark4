'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { User, Package, Heart, MapPin, Settings, LogOut, Headphones } from 'lucide-react'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Profile', href: '/account', icon: User },
  { label: 'Orders', href: '/account/orders', icon: Package },
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { label: 'Addresses', href: '/account/addresses', icon: MapPin },
  { label: 'Help', href: '/account/help', icon: Headphones },
  { label: 'Settings', href: '/account/settings', icon: Settings },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <StorefrontShell>
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
        {/* Horizontal scrollable nav cards */}
        <div className="relative -mx-4 px-4 mb-6">
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/account' && pathname.startsWith(href))
              const isExactActive = href === '/account' && pathname === '/account'
              const active = isActive || isExactActive
              return (
                <Link key={href} href={href} className="snap-start flex-shrink-0">
                  <motion.div
                    className={cn(
                      'flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl min-w-[80px] text-center transition-all border',
                      active
                        ? 'bg-clay-blush border-clay-rose/20'
                        : 'bg-clay-bg-card border-clay-border-light hover:bg-clay-bg-sunken/50'
                    )}
                    style={{
                      boxShadow: active
                        ? '0 4px 8px -2px rgba(var(--clay-rose-rgb, 200 100 100) / 0.25), 0 8px 16px -4px rgba(var(--clay-rose-rgb, 200 100 100) / 0.15), 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)'
                        : '0 2px 6px -1px rgba(0,0,0,0.08), 0 6px 14px -4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
                    }}
                    whileHover={{ y: -4, boxShadow: '0 6px 12px -2px rgba(0,0,0,0.12), 0 12px 24px -6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                    whileTap={{ y: 0, scale: 0.96, boxShadow: '0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                      active ? 'bg-clay-rose text-white' : 'bg-clay-bg-sunken text-clay-text-muted'
                    )}>
                      <Icon size={17} />
                    </div>
                    <span className={cn(
                      'text-[11px] font-semibold leading-tight',
                      active ? 'text-clay-rose' : 'text-clay-text-secondary'
                    )}>
                      {label}
                    </span>
                  </motion.div>
                </Link>
              )
            })}

            {/* Sign Out card */}
            <button onClick={logout} className="snap-start flex-shrink-0">
              <motion.div
                className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl min-w-[80px] text-center bg-clay-bg-card border border-clay-border-light hover:bg-clay-error/5 transition-all"
                style={{ boxShadow: '0 2px 6px -1px rgba(0,0,0,0.08), 0 6px 14px -4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                whileHover={{ y: -4, boxShadow: '0 6px 12px -2px rgba(0,0,0,0.12), 0 12px 24px -6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                whileTap={{ y: 0, scale: 0.96, boxShadow: '0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <div className="w-9 h-9 rounded-xl bg-clay-bg-sunken flex items-center justify-center text-clay-error">
                  <LogOut size={17} />
                </div>
                <span className="text-[11px] font-semibold text-clay-error leading-tight">
                  Sign Out
                </span>
              </motion.div>
            </button>
          </div>
        </div>

        {/* Content */}
        <main>{children}</main>
      </div>
    </StorefrontShell>
  )
}
