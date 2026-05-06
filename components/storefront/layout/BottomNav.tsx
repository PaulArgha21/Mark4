'use client'
import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion'
import {
  Home, Search, Heart, ShoppingBag, User, X, ChevronUp,
  Minus, Plus, Trash2, Ruler, Clock, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'
import { useCart } from '@/hooks/useCart'
import { useSizePreference } from '@/hooks/useSizePreference'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

/* ── Recently viewed products (stored in localStorage) ── */
function useRecentlyViewed() {
  const [items, setItems] = useState<{ id: string; slug: string; name: string; image: string; price: number; salePrice?: number | null }[]>([])
  useEffect(() => {
    try {
      const raw = localStorage.getItem('aprdite-recently-viewed')
      if (raw) setItems(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])
  return items
}

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const SHOE_SIZES = ['6', '7', '8', '9', '10', '11', '12']

/* ── Tab definitions ── */
type PanelTab = 'recent' | 'cart' | 'wishlist' | 'size'

const navItems = [
  { label: 'Home',     href: '/',         icon: Home },
  { label: 'Search',   href: '/search',   icon: Search },
  { label: 'Wishlist', href: '/account/wishlist',  icon: Heart },
  { label: 'Cart',     href: '/cart',      icon: ShoppingBag },
  { label: 'Account',  href: '/account',   icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { cart, cartCount, removeFromCart, updateQuantity } = useCart()
  const recentItems = useRecentlyViewed()
  const { clothingSize, shoeSize, setClothingSize, setShoeSize, hasPreference, preferredSize } = useSizePreference()
  const { data: wishlistProducts } = useSWR('/api/storefront/wishlist', fetcher, { revalidateOnFocus: false })

  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<PanelTab>('recent')

  // Drag to dismiss
  const panelY = useMotionValue(0)
  const panelOpacity = useTransform(panelY, [0, 300], [1, 0])

  const openPanel = useCallback((tab: PanelTab) => {
    setActiveTab(tab)
    setIsPanelOpen(true)
    panelY.set(0)
  }, [panelY])

  const closePanel = useCallback(() => {
    animate(panelY, 500, { type: 'spring', stiffness: 300, damping: 30 }).then(() => {
      setIsPanelOpen(false)
    })
  }, [panelY])

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      closePanel()
    } else {
      animate(panelY, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }, [closePanel, panelY])

  const handleNavTap = useCallback((label: string, href: string) => {
    if (label === 'Cart') {
      if (isPanelOpen && activeTab === 'cart') { closePanel(); return }
      openPanel('cart')
      return
    }
    if (label === 'Wishlist') {
      if (isPanelOpen && activeTab === 'wishlist') { closePanel(); return }
      openPanel('wishlist')
      return
    }
    if (isPanelOpen) closePanel()
    router.push(href)
  }, [isPanelOpen, activeTab, openPanel, closePanel, router])

  return (
    <>
      {/* ═══════ SLIDE-UP PANEL ═══════ */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
            />

            {/* Panel */}
            <motion.div
              className="fixed left-0 right-0 bottom-0 z-50 md:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              style={{ y: panelY, opacity: panelOpacity }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              <div className="bg-white dark:bg-clay-bg-elevated rounded-t-3xl overflow-hidden"
                style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.12)', maxHeight: '70vh' }}>

                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-clay-border-light" />
                </div>

                {/* Tab switcher */}
                <div className="flex items-center gap-1 px-4 pb-2">
                  {([
                    { key: 'recent', label: 'Recent', icon: Clock },
                    { key: 'cart', label: `Cart${cartCount > 0 ? ` (${cartCount})` : ''}`, icon: ShoppingBag },
                    { key: 'wishlist', label: 'Wishlist', icon: Heart },
                    { key: 'size', label: 'Size', icon: Ruler },
                  ] as { key: PanelTab; label: string; icon: typeof Clock }[]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all',
                        activeTab === tab.key
                          ? 'bg-clay-rose text-white'
                          : 'bg-clay-bg-sunken/60 text-clay-text-secondary hover:bg-clay-bg-sunken'
                      )}
                    >
                      <tab.icon size={13} />
                      {tab.label}
                    </button>
                  ))}
                  <button onClick={closePanel} className="ml-auto p-1.5 rounded-full hover:bg-clay-bg-sunken transition-colors">
                    <X size={16} className="text-clay-text-muted" />
                  </button>
                </div>

                {/* Content area */}
                <div className="overflow-y-auto px-4 pb-20" style={{ maxHeight: 'calc(70vh - 80px)' }}>
                  <AnimatePresence mode="wait">
                    {activeTab === 'recent' && (
                      <motion.div key="recent" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                        <RecentTab items={recentItems} />
                      </motion.div>
                    )}
                    {activeTab === 'cart' && (
                      <motion.div key="cart" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                        <CartTab cart={cart} removeFromCart={removeFromCart} updateQuantity={updateQuantity} onViewCart={() => { closePanel(); router.push('/cart') }} />
                      </motion.div>
                    )}
                    {activeTab === 'wishlist' && (
                      <motion.div key="wishlist" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                        <WishlistTab items={wishlistProducts} onViewAll={() => { closePanel(); router.push('/account/wishlist') }} />
                      </motion.div>
                    )}
                    {activeTab === 'size' && (
                      <motion.div key="size" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
                        <SizeTab
                          clothingSize={clothingSize} shoeSize={shoeSize}
                          setClothingSize={setClothingSize} setShoeSize={setShoeSize}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════ BOTTOM NAV BAR ═══════ */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        animate={{ y: isPanelOpen ? 80 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        {/* Swipe-up pill + active size badge */}
        {!isPanelOpen && (
          <div className="flex justify-center items-center gap-2 -mb-1">
            {hasPreference && (
              <motion.button
                onClick={() => openPanel('size')}
                className="flex items-center gap-1 px-3 py-1 rounded-t-xl text-white"
                style={{ background: 'linear-gradient(135deg, #e84393, #a29bfe)', boxShadow: '0 -2px 12px rgba(232,67,147,0.2)' }}
                whileTap={{ scale: 0.92 }}
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <Ruler size={11} />
                <span className="text-[10px] font-extrabold uppercase tracking-wide">{preferredSize}</span>
              </motion.button>
            )}
            <motion.button
              onClick={() => openPanel('recent')}
              className="flex items-center gap-1 px-4 py-1 rounded-t-xl backdrop-blur-xl bg-white/80 dark:bg-clay-bg-base/80 border border-b-0 border-white/30"
              style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronUp size={14} className="text-clay-text-muted" />
              <span className="text-[10px] font-bold text-clay-text-muted uppercase tracking-wider">Quick View</span>
            </motion.button>
          </div>
        )}

        <div className="backdrop-blur-2xl bg-white/70 dark:bg-clay-bg-base/70 border-t border-white/20 dark:border-white/5 safe-bottom"
          style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-around h-[56px] px-2 max-w-md mx-auto">
            {navItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              const isPanelActive = isPanelOpen && (
                (label === 'Cart' && activeTab === 'cart') ||
                (label === 'Wishlist' && activeTab === 'wishlist')
              )

              return (
                <button key={href} onClick={() => handleNavTap(label, href)} className="flex-1">
                  <motion.div
                    className="flex flex-col items-center justify-center gap-[3px] py-1.5 relative"
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <div className="relative">
                      {(isActive || isPanelActive) && (
                        <motion.div
                          className="absolute -inset-x-2.5 -inset-y-1 rounded-full"
                          layoutId="navPill"
                          style={{ background: 'rgba(214, 51, 108, 0.12)' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <Icon
                        size={22}
                        className={cn(
                          'relative z-10 transition-colors duration-150',
                          (isActive || isPanelActive) ? 'text-clay-rose' : 'text-clay-text-muted'
                        )}
                        strokeWidth={(isActive || isPanelActive) ? 2.3 : 1.7}
                        fill={(isActive || isPanelActive) ? 'currentColor' : 'none'}
                      />
                      {label === 'Cart' && cartCount > 0 && (
                        <motion.span
                          className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-clay-rose text-white text-[9px] font-bold rounded-full flex items-center justify-center z-20"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={springs.bouncy}
                          style={{ boxShadow: '0 0 6px rgba(214,51,108,0.4)' }}
                        >
                          {cartCount > 9 ? '9+' : cartCount}
                        </motion.span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-semibold leading-none relative z-10',
                        (isActive || isPanelActive) ? 'text-clay-rose' : 'text-clay-text-muted'
                      )}
                    >
                      {label}
                    </span>
                  </motion.div>
                </button>
              )
            })}
          </div>
        </div>
      </motion.nav>
    </>
  )
}

/* ═══════════════════════════════════════
   TAB COMPONENTS
   ═══════════════════════════════════════ */

function RecentTab({ items }: { items: { id: string; slug: string; name: string; image: string; price: number; salePrice?: number | null }[] }) {
  if (!items.length) {
    return (
      <div className="py-8 text-center">
        <Clock size={28} className="mx-auto text-clay-text-muted mb-2" />
        <p className="text-sm text-clay-text-muted">No recently viewed products</p>
        <p className="text-xs text-clay-text-muted/60 mt-1">Products you browse will show up here</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 py-2">
      <p className="text-[10px] font-bold text-clay-text-muted uppercase tracking-widest mb-2">Recently Viewed</p>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {items.slice(0, 12).map(item => (
          <Link key={item.id} href={`/product/${item.slug}`} className="group flex-shrink-0 w-[140px] snap-start">
            <div
              className="rounded-2xl overflow-hidden bg-white dark:bg-clay-bg-card border border-gray-100 dark:border-white/10 transition-transform duration-300 group-hover:-translate-y-1"
              style={{
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.08), 0 8px 24px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="140px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-clay-text truncate">{item.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {item.salePrice ? (
                    <>
                      <span className="text-[11px] font-bold text-clay-rose">₹{item.salePrice}</span>
                      <span className="text-[9px] text-clay-text-muted line-through">₹{item.price}</span>
                    </>
                  ) : (
                    <span className="text-[11px] font-bold text-clay-text">₹{item.price}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function CartTab({
  cart, removeFromCart, updateQuantity, onViewCart,
}: {
  cart: { items: { id: string; quantity: number; lineTotal: number; product: { id: string; name: string; slug: string; image: string; basePrice: number; salePrice?: number | null }; variant: { size?: string | null; color?: string | null } }[]; total: number } | undefined
  removeFromCart: (id: string) => Promise<void>
  updateQuantity: (id: string, qty: number) => Promise<void>
  onViewCart: () => void
}) {
  if (!cart?.items?.length) {
    return (
      <div className="py-8 text-center">
        <ShoppingBag size={28} className="mx-auto text-clay-text-muted mb-2" />
        <p className="text-sm text-clay-text-muted">Your cart is empty</p>
        <p className="text-xs text-clay-text-muted/60 mt-1">Start shopping to add items</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-clay-text-muted uppercase tracking-widest">Cart Items</p>
        <button onClick={onViewCart} className="text-[11px] font-bold text-clay-rose">View Full Cart →</button>
      </div>
      <div className="space-y-2.5 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 200px)', WebkitOverflowScrolling: 'touch' }}>
        {cart.items.map(item => (
          <div key={item.id} className="flex gap-3 p-2.5 rounded-2xl bg-clay-bg-sunken/30 border border-clay-border-light/20">
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
              <Image src={item.product.image} alt={item.product.name} fill className="object-cover" sizes="64px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-clay-text truncate">{item.product.name}</p>
              {(item.variant.size || item.variant.color) && (
                <p className="text-[10px] text-clay-text-muted mt-0.5">
                  {[item.variant.size, item.variant.color].filter(Boolean).join(' · ')}
                </p>
              )}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs font-bold" style={{ background: 'linear-gradient(90deg, #e84393, #fd79a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  ₹{item.lineTotal}
                </span>
                <div className="flex items-center gap-0">
                  <button
                    onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeFromCart(item.id)}
                    className="w-7 h-7 rounded-lg bg-clay-bg-sunken flex items-center justify-center active:scale-90 transition-transform"
                  >
                    {item.quantity === 1 ? <Trash2 size={12} className="text-clay-error" /> : <Minus size={12} />}
                  </button>
                  <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-clay-bg-sunken flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Total + checkout */}
      <div className="mt-3 pt-3 border-t border-clay-border-light/30 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-clay-text-muted font-medium">Total</p>
          <p className="text-base font-extrabold text-clay-text">₹{cart.total}</p>
        </div>
        <button
          onClick={onViewCart}
          className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #e84393, #fd79a8)', boxShadow: '0 4px 16px rgba(232,67,147,0.3)' }}
        >
          Checkout
        </button>
      </div>
    </div>
  )
}

function WishlistTab({ items, onViewAll }: {
  items: { id: string; product: { id: string; slug: string; name: string; brand?: string | null; image: string; basePrice: number; salePrice?: number | null } }[] | undefined
  onViewAll: () => void
}) {
  if (!items?.length) {
    return (
      <div className="py-8 text-center">
        <Heart size={28} className="mx-auto text-clay-text-muted mb-2" />
        <p className="text-sm text-clay-text-muted">Your wishlist is empty</p>
        <p className="text-xs text-clay-text-muted/60 mt-1">Save items you love for later</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-clay-text-muted uppercase tracking-widest">Wishlist</p>
        <button onClick={onViewAll} className="text-[11px] font-bold text-clay-rose">View All →</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {items.slice(0, 12).map(item => (
          <Link key={item.id} href={`/product/${item.product.slug}`} className="group flex-shrink-0 w-[140px] snap-start">
            <div
              className="rounded-2xl overflow-hidden bg-white dark:bg-clay-bg-card border border-gray-100 dark:border-white/10 transition-transform duration-300 group-hover:-translate-y-1"
              style={{
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.08), 0 8px 24px -4px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <Image src={item.product.image} alt={item.product.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" sizes="140px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e84393, #fd79a8)', boxShadow: '0 2px 8px rgba(232,67,147,0.3)' }}>
                  <Heart size={13} className="text-white" fill="white" />
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-semibold text-clay-text truncate">{item.product.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {item.product.salePrice ? (
                    <>
                      <span className="text-[11px] font-bold text-clay-rose">₹{item.product.salePrice}</span>
                      <span className="text-[9px] text-clay-text-muted line-through">₹{item.product.basePrice}</span>
                    </>
                  ) : (
                    <span className="text-[11px] font-bold text-clay-text">₹{item.product.basePrice}</span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SizeTab({ clothingSize, shoeSize, setClothingSize, setShoeSize }: {
  clothingSize: string; shoeSize: string
  setClothingSize: (s: string) => void; setShoeSize: (s: string) => void
}) {
  return (
    <div className="py-3 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Ruler size={15} className="text-clay-rose" />
          <p className="text-xs font-bold text-clay-text">Clothing Size</p>
          {clothingSize && <span className="ml-auto text-[10px] font-bold text-clay-rose bg-clay-rose/10 px-2 py-0.5 rounded-full">{clothingSize}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map(size => (
            <button
              key={size}
              onClick={() => setClothingSize(clothingSize === size ? '' : size)}
              className={cn(
                'w-11 h-11 rounded-xl text-xs font-bold transition-all active:scale-90',
                clothingSize === size
                  ? 'text-white'
                  : 'bg-clay-bg-sunken/60 text-clay-text-secondary border border-clay-border-light/30 hover:border-clay-rose/30'
              )}
              style={clothingSize === size ? { background: 'linear-gradient(135deg, #e84393, #fd79a8)', boxShadow: '0 4px 12px rgba(232,67,147,0.25)' } : undefined}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star size={15} className="text-violet-500" />
          <p className="text-xs font-bold text-clay-text">Shoe Size (UK)</p>
          {shoeSize && <span className="ml-auto text-[10px] font-bold text-violet-600 bg-violet-100 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">UK {shoeSize}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {SHOE_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setShoeSize(shoeSize === size ? '' : size)}
              className={cn(
                'w-11 h-11 rounded-xl text-xs font-bold transition-all active:scale-90',
                shoeSize === size
                  ? 'text-white'
                  : 'bg-clay-bg-sunken/60 text-clay-text-secondary border border-clay-border-light/30 hover:border-violet-300'
              )}
              style={shoeSize === size ? { background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', boxShadow: '0 4px 12px rgba(108,92,231,0.25)' } : undefined}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 p-3 rounded-2xl bg-gradient-to-r from-clay-rose/5 to-violet-500/5 border border-clay-rose/10">
        <p className="text-[11px] font-semibold text-clay-text text-center">
          {clothingSize || shoeSize ? '✨ Products are now filtered to your size' : 'Select a size to filter all products'}
        </p>
        <p className="text-[10px] text-clay-text-muted text-center mt-0.5">
          {clothingSize || shoeSize ? 'Only products available in your size will show' : 'Tap a size above to personalize your experience'}
        </p>
      </div>
    </div>
  )
}
