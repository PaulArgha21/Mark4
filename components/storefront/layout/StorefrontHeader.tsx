'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Search, ShoppingBag, Heart, User, Menu, X, Sun, Moon, ChevronLeft, Package, MapPin, Settings, LogOut, ChevronRight, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'
import { AprditeLogoIcon } from '@/components/shared/AprditeLogo'
import useSWR from 'swr'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { useTheme } from '@/components/providers/ThemeProvider'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

interface Category {
  id: string
  name: string
  slug: string
  children?: Category[]
}

export function StorefrontHeader() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()
  const { cartCount } = useCart()
  const { theme, toggleTheme } = useTheme()

  const isHome = pathname === '/'

  const { scrollY } = useScroll()
  const headerBg = useTransform(
    scrollY,
    [0, 80],
    theme === 'dark'
      ? ['rgba(26,26,31,0)', 'rgba(26,26,31,0.95)']
      : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']
  )
  const headerShadow = useTransform(
    scrollY,
    [0, 80],
    ['0 0 0 0 transparent', '0 4px 6px rgba(0,0,0,0.04)']
  )
  const headerBackdrop = useTransform(scrollY, [0, 80], ['blur(0px)', 'blur(20px)'])

  const { data: categories } = useSWR<Category[]>('/api/storefront/categories', fetcher)
  const { data: siteSettings } = useSWR('/api/storefront/site-settings', fetcher)

  const brandName = siteSettings?.siteName || 'Aprdite'

  // Get page title for mobile header
  const getPageTitle = () => {
    if (isHome) return null
    if (pathname.startsWith('/cart')) return 'Cart'
    if (pathname.startsWith('/account/wishlist')) return 'Wishlist'
    if (pathname.startsWith('/account/orders')) return 'Orders'
    if (pathname.startsWith('/account/addresses')) return 'Addresses'
    if (pathname.startsWith('/account/settings')) return 'Settings'
    if (pathname.startsWith('/account')) return 'Account'
    if (pathname.startsWith('/login')) return 'Sign In'
    if (pathname.startsWith('/register')) return 'Register'
    if (pathname.startsWith('/search')) return 'Search'
    if (pathname.startsWith('/checkout')) return 'Checkout'
    if (pathname.startsWith('/product/')) return 'Product'
    if (pathname.startsWith('/category/')) return 'Shop'
    return null
  }

  const pageTitle = getPageTitle()

  return (
    <>
      {/* ═══════ MOBILE HEADER — App Bar ═══════ */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden safe-top backdrop-blur-xl bg-white/30 dark:bg-clay-bg-base/30 border-b border-white/20 dark:border-white/5" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between h-[52px] px-2">
          {/* Left: Back/Menu + Brand */}
          <div className="flex items-center gap-0.5 min-w-[72px]">
            {!isHome ? (
              <motion.button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-clay-bg-sunken/60 transition-colors"
                whileTap={{ scale: 0.88 }}
              >
                <ChevronLeft size={22} className="text-clay-text" />
              </motion.button>
            ) : (
              <>
                <motion.button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-clay-bg-sunken/60 transition-colors"
                  whileTap={{ scale: 0.88 }}
                >
                  <Menu size={20} className="text-clay-text" />
                </motion.button>
                <Link href="/" className="pl-0.5 flex items-center gap-1.5">
                  <AprditeLogoIcon size={28} />
                  <span
                    className="font-display text-lg font-bold tracking-tight"
                    style={{
                      background: 'linear-gradient(135deg, var(--clay-rose), var(--clay-rose-light))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {brandName}
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Center: Page title (non-home) or nothing (home, brand is left) */}
          <div className="flex-1 text-center">
            {pageTitle && (
              <motion.span
                className="text-[15px] font-semibold text-clay-text"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                key={pageTitle}
              >
                {pageTitle}
              </motion.span>
            )}
          </div>

          {/* Right: Search + Cart */}
          <div className="flex items-center gap-0.5 min-w-[72px] justify-end">
            <motion.button
              className="w-9 h-9 rounded-full flex items-center justify-center active:bg-clay-bg-sunken/60 transition-colors"
              onClick={() => setIsSearchOpen(true)}
              whileTap={{ scale: 0.88 }}
            >
              <Search size={19} className="text-clay-text-secondary" />
            </motion.button>
            <Link href="/cart">
              <motion.div
                className="relative w-9 h-9 rounded-full flex items-center justify-center active:bg-clay-bg-sunken/60 transition-colors"
                whileTap={{ scale: 0.88 }}
              >
                <ShoppingBag size={19} className="text-clay-text-secondary" />
                {cartCount > 0 && (
                  <motion.span
                    className="absolute top-0.5 right-0 min-w-[15px] h-[15px] px-0.5 bg-clay-rose text-white text-[8px] font-bold rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springs.bouncy}
                    style={{ boxShadow: '0 0 6px rgba(214,51,108,0.3)' }}
                  >
                    {cartCount}
                  </motion.span>
                )}
              </motion.div>
            </Link>
          </div>
        </div>
      </header>

      {/* ═══════ DESKTOP HEADER — Full nav ═══════ */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 hidden md:block border-b border-white/20 dark:border-white/5"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{
          backgroundColor: headerBg,
          boxShadow: headerShadow,
          backdropFilter: headerBackdrop,
          WebkitBackdropFilter: headerBackdrop,
        } as any}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-[72px]">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-3">
              <motion.button
                className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-clay-bg-sunken/80 transition-colors"
                onClick={() => setIsMobileMenuOpen(true)}
                whileTap={{ scale: 0.9 }}
              >
                <Menu size={22} />
              </motion.button>
              <Link href="/" className="flex items-center gap-2.5">
                <AprditeLogoIcon size={36} />
                <motion.span
                  className="font-display text-[28px] font-bold tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, var(--clay-rose), var(--clay-rose-light))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                  whileHover={{ scale: 1.03 }}
                  transition={springs.bouncy}
                >
                  {brandName}
                </motion.span>
              </Link>
            </div>

            {/* Center: Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {categories?.slice(0, 6).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className="animated-underline px-3.5 py-2 text-[13px] font-medium text-clay-text-secondary hover:text-clay-text rounded-lg transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>

            {/* Right: All actions */}
            <div className="flex items-center gap-0.5">
              <motion.button
                className="p-2.5 rounded-xl hover:bg-clay-bg-sunken/80 transition-colors"
                onClick={() => setIsSearchOpen(true)}
                whileTap={{ scale: 0.9 }}
              >
                <Search size={19} className="text-clay-text-secondary" />
              </motion.button>

              <motion.button
                className="p-2.5 rounded-xl hover:bg-clay-bg-sunken/80 transition-colors"
                onClick={toggleTheme}
                whileTap={{ scale: 0.9, rotate: 180 }}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun size={19} className="text-clay-butter" />
                ) : (
                  <Moon size={19} className="text-clay-text-secondary" />
                )}
              </motion.button>

              <Link href="/account/wishlist">
                <motion.div
                  className="p-2.5 rounded-xl hover:bg-clay-bg-sunken/80 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart size={19} className="text-clay-text-secondary" />
                </motion.div>
              </Link>

              <Link href={isAuthenticated ? '/account' : '/login'}>
                <motion.div
                  className="p-2.5 rounded-xl hover:bg-clay-bg-sunken/80 transition-colors relative"
                  whileTap={{ scale: 0.9 }}
                >
                  <User size={19} className={isAuthenticated ? 'text-clay-rose' : 'text-clay-text-secondary'} />
                  {isAuthenticated && (
                    <motion.span
                      className="absolute top-1 right-1 w-2 h-2 bg-clay-sage rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
                    />
                  )}
                </motion.div>
              </Link>

              <Link href="/cart">
                <motion.div
                  className="relative p-2.5 rounded-xl hover:bg-clay-bg-sunken/80 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <ShoppingBag size={19} className="text-clay-text-secondary" />
                  {cartCount > 0 && (
                    <motion.span
                      className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-clay-rose text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springs.bouncy}
                      style={{ boxShadow: '0 0 8px rgba(214,51,108,0.3)' }}
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              className="absolute top-0 left-0 right-0 glass-ios safe-top"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={springs.gentle}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
                <div className="flex items-center gap-3 bg-clay-bg-sunken/80 rounded-2xl px-4 py-3 md:px-5 md:py-3.5 shadow-inner">
                  <Search size={18} className="text-clay-rose flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search products, brands..."
                    className="flex-1 bg-transparent text-[15px] text-clay-text placeholder:text-clay-text-muted focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        setIsSearchOpen(false)
                        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                      }
                    }}
                    autoFocus
                  />
                  <motion.button
                    onClick={() => setIsSearchOpen(false)}
                    className="p-1.5 rounded-full hover:bg-clay-bg-sunken transition-colors"
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={16} className="text-clay-text-muted" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ App Navigation Drawer ═══════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer — Glossy Glass 3D Box */}
            <motion.aside
              className="fixed top-0 left-0 bottom-0 w-[280px] md:w-[300px] z-[56] lg:hidden overflow-y-auto overscroll-contain rounded-r-3xl border border-white/50 flex flex-col"
              style={{
                background: 'linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.75) 50%, rgba(240,240,255,0.82) 100%)',
                backdropFilter: 'blur(32px) saturate(1.8) brightness(1.05)',
                WebkitBackdropFilter: 'blur(32px) saturate(1.8) brightness(1.05)',
                boxShadow: '6px 0 40px rgba(0,0,0,0.12), 2px 0 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9), inset -1px 0 0 rgba(255,255,255,0.6)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              {/* Profile Header */}
              <div className="safe-top">
                <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/20"
                      style={{ background: 'linear-gradient(135deg, var(--clay-rose), var(--clay-rose-light))' }}>
                      {isAuthenticated && user?.image ? (
                        <Image src={user.image} alt={user.name || 'Profile'} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        isAuthenticated ? (user?.name?.charAt(0)?.toUpperCase() || 'U') : '?'
                      )}
                    </div>
                    <div>
                      {isAuthenticated ? (
                        <>
                          <p className="text-sm font-semibold text-clay-text leading-tight">{user?.name || 'User'}</p>
                          <p className="text-[11px] text-clay-text-muted">{user?.email}</p>
                        </>
                      ) : (
                        <Link
                          href="/login"
                          className="text-sm font-semibold text-clay-rose"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign In / Register
                        </Link>
                      )}
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-clay-bg-sunken transition-colors"
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={18} className="text-clay-text-muted" />
                  </motion.button>
                </div>
              </div>

              <div className="app-divider" />

              {/* Shop by Category */}
              <div className="py-2">
                <p className="app-section-title text-[11px] font-bold uppercase tracking-widest text-clay-rose/80 px-5 mb-1">Shop</p>
                <nav className="px-2 space-y-1.5">
                  {categories?.map((cat, i) => (
                    <motion.div
                      key={cat.id}
                      initial={{ x: -16, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        href={`/category/${cat.slug}`}
                        className="flex items-center justify-between px-4 py-2.5 text-[13.5px] font-semibold text-gray-800 rounded-2xl transition-all active:scale-[0.97] bg-white/50 border border-white/60 hover:bg-white/70"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {cat.name}
                        <ChevronRight size={14} className="text-gray-500" />
                      </Link>
                    </motion.div>
                  ))}
                </nav>
              </div>

              <div className="app-divider mx-4" />

              {/* Account Links */}
              <div className="py-2">
                <p className="app-section-title text-[11px] font-bold uppercase tracking-widest text-clay-rose/80 px-5 mb-1">My Account</p>
                <div className="px-2 space-y-1.5">
                  {[
                    { href: '/account', icon: User, label: 'Profile' },
                    { href: '/account/orders', icon: Package, label: 'My Orders' },
                    { href: '/account/wishlist', icon: Heart, label: 'Wishlist' },
                    { href: '/account/addresses', icon: MapPin, label: 'Addresses' },
                    { href: '/account/settings', icon: Settings, label: 'Settings' },
                    { href: '/account/help', icon: Headphones, label: 'Help & Support' },
                  ].map(({ href, icon: Icon, label }, i) => (
                    <motion.div
                      key={href}
                      initial={{ x: -16, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.03 }}
                    >
                      <Link
                        href={href}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-gray-800 rounded-2xl transition-all active:scale-[0.97] bg-white/50 border border-white/60 hover:bg-white/70"
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon size={17} className="text-gray-600" />
                        {label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="app-divider mx-4" />

              {/* Preferences */}
              <div className="py-2 px-2">
                <motion.button
                  onClick={() => { toggleTheme() }}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-gray-800 rounded-2xl w-full transition-all active:scale-[0.97] bg-white/50 border border-white/60 hover:bg-white/70"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {theme === 'dark' ? (
                    <Sun size={17} className="text-clay-butter" />
                  ) : (
                    <Moon size={17} className="text-clay-text-muted" />
                  )}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </motion.button>
              </div>

              {/* Spacer to push logout to bottom */}
              <div className="flex-1" />

              {/* Logout — pinned at bottom */}
              {isAuthenticated && (
                <div className="px-2 pb-6 pt-2 safe-bottom">
                  <motion.button
                    className="flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-red-600 rounded-2xl w-full transition-all active:scale-[0.97] bg-white/50 border border-white/60 hover:bg-red-50/60"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)' }}
                    onClick={async () => {
                      setIsMobileMenuOpen(false)
                      await logout()
                    }}
                    initial={{ x: -16, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.22 }}
                  >
                    <LogOut size={17} />
                    Sign Out
                  </motion.button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header */}
      <div className="h-[52px] md:h-[72px]" />
    </>
  )
}
