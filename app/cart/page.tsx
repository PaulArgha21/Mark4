'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

export default function CartPage() {
  const { cart, isLoading, removeFromCart, updateQuantity } = useCart()
  const [couponCode, setCouponCode] = useState('')
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) { toast.error('Enter a coupon code'); return }
    setApplyingCoupon(true)
    try {
      // Coupon validation will be handled at checkout — show info toast
      toast.info('Coupon will be applied at checkout')
    } finally { setApplyingCoupon(false) }
  }

  return (
    <StorefrontShell>
      <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
        <motion.div
          className="flex items-end justify-between mb-5 md:mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-clay-rose mb-1">Your Bag</p>
            <h1 className="font-display text-xl md:text-3xl font-bold text-clay-text">
              Shopping Cart
            </h1>
          </div>
          {cart?.items?.length ? (
            <p className="text-sm text-clay-text-muted">{cart.items.length} item{cart.items.length > 1 ? 's' : ''}</p>
          ) : null}
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="clay-card p-4 h-32 animate-shimmer rounded-2xl" />
            ))}
          </div>
        ) : !cart?.items?.length ? (
          <motion.div
            className="text-center py-24"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <ShoppingBag size={72} className="mx-auto text-clay-text-muted/40 mb-6" strokeWidth={1} />
            </motion.div>
            <h2 className="font-display text-2xl font-bold text-clay-text mb-2">Your cart is empty</h2>
            <p className="text-clay-text-muted mb-8 max-w-xs mx-auto">Discover our curated collection and find something you love.</p>
            <Link href="/">
              <ClayButton variant="primary" size="lg" className="!rounded-2xl">
                Continue Shopping <ArrowRight size={18} />
              </ClayButton>
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-5 md:gap-8">
            {/* Cart Items */}
            <motion.div
              className="space-y-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={fadeUpVariants}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    layout
                    className="clay-card p-4"
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <Link href={`/product/${item.product.slug}`}>
                        <div className="relative w-20 h-24 md:w-24 md:h-32 rounded-clay-md overflow-hidden flex-shrink-0">
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          {item.product.brand && (
                            <p className="text-[10px] text-clay-text-muted uppercase tracking-wider">
                              {item.product.brand}
                            </p>
                          )}
                          <Link href={`/product/${item.product.slug}`}>
                            <h3 className="text-sm font-medium text-clay-text hover:text-clay-rose transition-colors line-clamp-2">
                              {item.product.name}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2 mt-1 text-xs text-clay-text-muted">
                            {item.variant.color && <span>Color: {item.variant.color}</span>}
                            {item.variant.size && <span>Size: {item.variant.size}</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* Quantity controls */}
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                if (item.quantity <= 1) {
                                  removeFromCart(item.id)
                                  toast.success('Removed from cart')
                                } else {
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-clay-bg-sunken flex items-center justify-center hover:bg-clay-border-light transition-colors"
                            >
                              <Minus size={14} />
                            </motion.button>
                            <span className="w-8 text-center text-sm font-medium text-clay-text">
                              {item.quantity}
                            </span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                if (item.variant.availableQty !== undefined && item.quantity >= item.variant.availableQty) {
                                  toast.error(`Only ${item.variant.availableQty} available`)
                                  return
                                }
                                updateQuantity(item.id, item.quantity + 1)
                              }}
                              className="w-8 h-8 rounded-full bg-clay-bg-sunken flex items-center justify-center hover:bg-clay-border-light transition-colors"
                            >
                              <Plus size={14} />
                            </motion.button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="text-sm font-bold text-clay-text">
                              {formatPrice(item.lineTotal)}
                            </p>
                            {item.product.salePrice && (
                              <p className="text-xs text-clay-text-muted line-through">
                                {formatPrice(item.product.basePrice * item.quantity)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          removeFromCart(item.id)
                          toast.success('Removed from cart')
                        }}
                        className="self-start p-2 text-clay-text-muted hover:text-clay-error transition-colors"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Order Summary — Premium Glass */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="clay-card p-6 sticky top-20 space-y-5 rounded-2xl">
                <h2 className="font-display text-lg font-bold text-clay-text">Order Summary</h2>

                {/* Coupon */}
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-clay-text-muted" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose/50"
                    />
                  </div>
                  <ClayButton variant="secondary" size="sm" onClick={handleApplyCoupon} loading={applyingCoupon} className="!rounded-xl">Apply</ClayButton>
                </div>

                <div className="space-y-3 pt-3 border-t border-clay-divider">
                  <div className="flex justify-between text-sm">
                    <span className="text-clay-text-secondary">Subtotal</span>
                    <span className="text-clay-text font-medium">{formatPrice(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-clay-text-secondary">Shipping</span>
                    <span className={cart.shippingCost === 0 ? 'text-clay-sage font-semibold' : 'text-clay-text font-medium'}>
                      {cart.shippingCost === 0 ? 'FREE' : formatPrice(cart.shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-clay-text-secondary">Tax (GST)</span>
                    <span className="text-clay-text font-medium">{formatPrice(cart.tax)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-4 border-t border-clay-divider">
                  <span className="font-bold text-clay-text">Total</span>
                  <span className="font-display text-2xl font-bold text-clay-text">{formatPrice(cart.total)}</span>
                </div>

                <Link href="/checkout" className="block">
                  <ClayButton variant="primary" size="lg" fullWidth className="!mt-1 !rounded-2xl">
                    Proceed to Checkout <ArrowRight size={18} />
                  </ClayButton>
                </Link>

                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <span className="flex items-center gap-1 text-[10px] text-clay-text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="m7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Secure
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-clay-text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Protected
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-clay-text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Transparent
                  </span>
                </div>

                <p className="text-[10px] text-center text-clay-text-muted">
                  Free shipping on orders above ₹999
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </StorefrontShell>
  )
}
