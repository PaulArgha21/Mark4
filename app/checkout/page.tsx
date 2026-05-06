'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, CreditCard, Truck, ChevronRight, Lock } from 'lucide-react'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export default function CheckoutPage() {
  const { cart, isLoading, mutate: mutateCart } = useCart() as ReturnType<typeof useCart>
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<'address' | 'payment'>('address')
  const [placing, setPlacing] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<string>('cod')
  const [showNewAddress, setShowNewAddress] = useState(false)

  const { data: addresses, mutate: mutateAddresses } = useSWR(
    isAuthenticated ? '/api/storefront/addresses' : null,
    fetcher
  )

  const [newAddress, setNewAddress] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', label: 'Home',
  })

  // Auto-select default address
  useEffect(() => {
    if (addresses?.length && !selectedAddressId) {
      const defaultAddr = addresses.find((a: { isDefault: boolean }) => a.isDefault)
      if (defaultAddr) setSelectedAddressId(defaultAddr.id)
    }
  }, [addresses, selectedAddressId])

  const handleSaveNewAddress = async () => {
    if (!newAddress.fullName || !newAddress.phone || !newAddress.addressLine1 || !newAddress.city || !newAddress.state || !newAddress.pincode) {
      toast.error('Please fill all required fields')
      return
    }
    try {
      const res = await fetch('/api/storefront/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newAddress, isDefault: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed')
      setSelectedAddressId(data.data.id)
      setShowNewAddress(false)
      mutateAddresses()
      toast.success('Address saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save address')
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) { toast.error('Please select a delivery address'); return }
    setPlacing(true)
    try {
      const paymentMap: Record<string, string> = { upi: 'UPI', card: 'CARD', cod: 'COD' }
      const res = await fetch('/api/storefront/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          addressId: selectedAddressId,
          paymentMethod: paymentMap[selectedPayment] || 'COD',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Checkout failed')
      await mutateCart()
      toast.success(`Order ${data.data.orderNumber} placed successfully!`)
      router.push('/account/orders')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setPlacing(false)
    }
  }

  if (isLoading) {
    return (
      <StorefrontShell>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-96 animate-shimmer rounded-clay-lg" />
        </div>
      </StorefrontShell>
    )
  }

  if (!cart?.items?.length) {
    return (
      <StorefrontShell>
        <div className="max-w-5xl mx-auto px-4 py-8 text-center py-20">
          <Truck size={64} className="mx-auto text-clay-text-muted mb-4" strokeWidth={1} />
          <h2 className="font-display text-xl font-bold text-clay-text mb-2">Your cart is empty</h2>
          <p className="text-clay-text-muted mb-6">Add some products before checking out.</p>
          <ClayButton variant="primary" size="lg" onClick={() => router.push('/')}>
            Continue Shopping
          </ClayButton>
        </div>
      </StorefrontShell>
    )
  }

  return (
    <StorefrontShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.h1
          className="font-display text-3xl font-bold text-clay-text mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Checkout
        </motion.h1>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <button
            onClick={() => setStep('address')}
            className={step === 'address' ? 'text-clay-rose font-semibold' : 'text-clay-text-muted'}
          >
            1. Address
          </button>
          <ChevronRight size={14} className="text-clay-text-muted" />
          <button
            onClick={() => setStep('payment')}
            className={step === 'payment' ? 'text-clay-rose font-semibold' : 'text-clay-text-muted'}
          >
            2. Payment
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Main */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={step}
          >
            {step === 'address' && (
              <motion.div variants={fadeUpVariants} className="clay-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={18} className="text-clay-rose" />
                  <h2 className="font-semibold text-clay-text">Delivery Address</h2>
                </div>

                {/* Saved Addresses */}
                {addresses?.length > 0 && (
                  <div className="space-y-2">
                    {addresses.map((addr: { id: string; label?: string; fullName: string; line1: string; line2?: string; city: string; state: string; postalCode: string; phone: string; isDefault: boolean }) => (
                      <label
                        key={addr.id}
                        className={`flex items-start gap-3 p-3 rounded-clay-md cursor-pointer border transition-colors ${
                          selectedAddressId === addr.id ? 'border-clay-rose bg-clay-blush' : 'border-clay-border-light bg-clay-bg-sunken hover:bg-clay-bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 accent-[var(--clay-rose)]"
                        />
                        <div>
                          <p className="text-sm font-medium text-clay-text">{addr.fullName} {addr.label && <span className="text-xs text-clay-text-muted">({addr.label})</span>}</p>
                          <p className="text-xs text-clay-text-secondary">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                          <p className="text-xs text-clay-text-secondary">{addr.city}, {addr.state} - {addr.postalCode}</p>
                          <p className="text-xs text-clay-text-muted">+91 {addr.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Add New Address Toggle */}
                {!showNewAddress ? (
                  <button
                    onClick={() => setShowNewAddress(true)}
                    className="text-sm text-clay-rose font-medium hover:underline"
                  >
                    + Add new address
                  </button>
                ) : (
                  <div className="space-y-3 p-4 bg-clay-bg-sunken rounded-clay-md">
                    <div className="grid md:grid-cols-2 gap-3">
                      <input value={newAddress.fullName} onChange={e => setNewAddress({ ...newAddress, fullName: e.target.value })} placeholder="Full Name *" className="w-full bg-clay-bg-surface border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-rose" />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-clay-text-muted pointer-events-none select-none">🇮🇳 +91</span>
                        <input value={newAddress.phone} onChange={e => { let v = e.target.value.replace(/[^\d]/g, ''); if (v.startsWith('91') && v.length > 10) v = v.slice(2); if (v.length <= 10) setNewAddress({ ...newAddress, phone: v }) }} placeholder="98765 43210" maxLength={10} className="w-full bg-clay-bg-surface border border-clay-border-light rounded-clay-sm pl-[4.5rem] pr-3 py-2.5 text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-rose" />
                      </div>
                    </div>
                    <input value={newAddress.addressLine1} onChange={e => setNewAddress({ ...newAddress, addressLine1: e.target.value })} placeholder="Address Line 1 *" className="w-full bg-clay-bg-surface border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-rose" />
                    <input value={newAddress.addressLine2} onChange={e => setNewAddress({ ...newAddress, addressLine2: e.target.value })} placeholder="Landmark (optional)" className="w-full bg-clay-bg-surface border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-rose" />
                    <div className="grid grid-cols-3 gap-3">
                      <input value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} placeholder="City *" className="w-full bg-clay-bg-surface border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-rose" />
                      <input value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} placeholder="State *" className="w-full bg-clay-bg-surface border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-rose" />
                      <input value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} placeholder="PIN *" className="w-full bg-clay-bg-surface border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-rose" />
                    </div>
                    <div className="flex gap-2">
                      <ClayButton variant="primary" size="sm" onClick={handleSaveNewAddress}>Save Address</ClayButton>
                      <ClayButton variant="ghost" size="sm" onClick={() => setShowNewAddress(false)}>Cancel</ClayButton>
                    </div>
                  </div>
                )}

                <ClayButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={() => {
                    if (!selectedAddressId) { toast.error('Please select or add an address'); return }
                    setStep('payment')
                  }}
                  className="!mt-6"
                >
                  Continue to Payment <ChevronRight size={18} />
                </ClayButton>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div variants={fadeUpVariants} className="clay-card p-6 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={18} className="text-clay-rose" />
                  <h2 className="font-semibold text-clay-text">Payment Method</h2>
                </div>

                {/* Payment Options */}
                {[
                  { id: 'upi', label: 'UPI (GPay, PhonePe, Paytm)', desc: 'Pay via any UPI app' },
                  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive' },
                ].map(opt => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-3 p-4 bg-clay-bg-sunken rounded-clay-md cursor-pointer hover:bg-clay-bg-surface transition-colors border border-transparent has-[:checked]:border-clay-rose has-[:checked]:bg-clay-blush"
                  >
                    <input type="radio" name="payment" value={opt.id} checked={selectedPayment === opt.id} onChange={() => setSelectedPayment(opt.id)} className="accent-[var(--clay-rose)]" />
                    <div>
                      <p className="text-sm font-medium text-clay-text">{opt.label}</p>
                      <p className="text-xs text-clay-text-muted">{opt.desc}</p>
                    </div>
                  </label>
                ))}

                <ClayButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handlePlaceOrder}
                  loading={placing}
                  className="!mt-6"
                >
                  <Lock size={16} /> Place Order — {formatPrice(cart?.total || 0)}
                </ClayButton>

                <p className="text-xs text-center text-clay-text-muted flex items-center justify-center gap-1">
                  <Lock size={10} /> Secured by Razorpay. 256-bit encryption.
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Order Summary Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="clay-card p-5 sticky top-20 space-y-4">
              <h3 className="font-semibold text-clay-text">Order Summary ({cart?.items?.length || 0} items)</h3>

              <div className="space-y-3 max-h-60 overflow-y-auto clay-scrollbar">
                {cart?.items?.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-12 h-16 rounded-clay-sm overflow-hidden flex-shrink-0">
                      <Image src={item.product.image} alt={item.product.name} fill className="object-cover" sizes="48px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-clay-text line-clamp-1">{item.product.name}</p>
                      <p className="text-[10px] text-clay-text-muted">Qty: {item.quantity}</p>
                      <p className="text-xs font-bold text-clay-text">{formatPrice(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-clay-divider text-sm">
                <div className="flex justify-between">
                  <span className="text-clay-text-secondary">Subtotal</span>
                  <span className="font-medium">{formatPrice(cart?.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-clay-text-secondary">Shipping</span>
                  <span className={cart?.shippingCost === 0 ? 'text-clay-sage font-medium' : 'font-medium'}>
                    {cart?.shippingCost === 0 ? 'FREE' : formatPrice(cart?.shippingCost || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-clay-text-secondary">Tax</span>
                  <span className="font-medium">{formatPrice(cart?.tax || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-clay-divider">
                <span className="font-bold text-clay-text">Total</span>
                <span className="font-display text-xl font-bold text-clay-text">{formatPrice(cart?.total || 0)}</span>
              </div>

              <div className="flex items-center gap-2 p-3 bg-clay-sage/10 rounded-clay-md">
                <Truck size={16} className="text-clay-sage flex-shrink-0" />
                <p className="text-xs text-clay-sage">Estimated delivery in 3-5 business days</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </StorefrontShell>
  )
}
