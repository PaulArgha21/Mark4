'use client'
import { useState, useCallback } from 'react'
import { Truck, MapPin, Clock, Package, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface DeliveryEstimateProps {
  variantId?: string | null
}

interface EstimateData {
  isServiceable: boolean
  isCODAvailable: boolean
  minDays: number
  maxDays: number
  deliveryDateMin: string
  deliveryDateMax: string
  shippingCost: number
  freeShippingAbove: number | null
  isExpressAvailable: boolean
  expressMinDays?: number
  expressMaxDays?: number
  expressCost?: number
  warehouseCity?: string
  zoneName: string
  deliveryNote?: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

export function DeliveryEstimate({ variantId }: DeliveryEstimateProps) {
  const [pincode, setPincode] = useState('')
  const [loading, setLoading] = useState(false)
  const [estimate, setEstimate] = useState<EstimateData | null>(null)
  const [error, setError] = useState('')

  const checkDelivery = useCallback(async () => {
    if (pincode.length !== 6) {
      setError('Enter a valid 6-digit pincode')
      return
    }
    setLoading(true)
    setError('')
    setEstimate(null)
    try {
      const url = `/api/storefront/delivery-estimate?pincode=${pincode}${variantId ? `&variantId=${variantId}` : ''}`
      const res = await fetch(url)
      const { data } = await res.json()
      if (data) {
        setEstimate(data)
      } else {
        setError('Unable to fetch delivery estimate')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [pincode, variantId])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck size={16} className="text-clay-sage" />
        <span className="text-sm font-semibold text-clay-text">Delivery Estimate</span>
      </div>

      {/* Pincode Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={pincode}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6)
              setPincode(v)
              if (v.length < 6) { setEstimate(null); setError('') }
            }}
            onKeyDown={e => e.key === 'Enter' && checkDelivery()}
            placeholder="Enter pincode"
            maxLength={6}
            className="w-full px-3 py-2.5 rounded-xl border border-clay-border bg-clay-bg text-sm text-clay-text placeholder:text-clay-text-muted focus:outline-none focus:ring-2 focus:ring-clay-sage/30 focus:border-clay-sage font-mono transition-all"
          />
          {pincode.length === 6 && !loading && (
            <MapPin size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-clay-sage" />
          )}
        </div>
        <button
          onClick={checkDelivery}
          disabled={pincode.length !== 6 || loading}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-clay-sage text-white hover:bg-clay-sage/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '...' : 'Check'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-clay-error flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Result */}
      <AnimatePresence mode="wait">
        {estimate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {estimate.isServiceable ? (
              <div className="p-3 rounded-xl bg-clay-sage/5 border border-clay-sage/20 space-y-2.5">
                {/* Delivery Date */}
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-clay-sage flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-clay-text">
                      {formatDate(estimate.deliveryDateMin)} – {formatDate(estimate.deliveryDateMax)}
                    </p>
                    <p className="text-[11px] text-clay-text-muted">
                      Standard delivery ({estimate.minDays}–{estimate.maxDays} days)
                    </p>
                  </div>
                </div>

                {/* Express */}
                {estimate.isExpressAvailable && estimate.expressMinDays && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-clay-butter flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-clay-text">
                        Express: {estimate.expressMinDays}–{estimate.expressMaxDays} days
                        {estimate.expressCost ? ` (₹${estimate.expressCost})` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Shipping cost */}
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-clay-sage flex-shrink-0" />
                  <p className="text-xs text-clay-text-secondary">
                    {estimate.shippingCost === 0
                      ? 'Free delivery'
                      : `Delivery: ₹${estimate.shippingCost}`}
                    {estimate.freeShippingAbove && estimate.shippingCost > 0 && (
                      <span className="text-clay-sage ml-1">(Free above ₹{estimate.freeShippingAbove})</span>
                    )}
                  </p>
                </div>

                {/* COD */}
                {estimate.isCODAvailable && (
                  <p className="text-[11px] text-clay-text-muted flex items-center gap-1">
                    <Check size={10} className="text-clay-sage" /> Cash on Delivery available
                  </p>
                )}

                {/* Ships from */}
                {estimate.warehouseCity && (
                  <p className="text-[11px] text-clay-text-muted flex items-center gap-1">
                    <MapPin size={10} /> Ships from {estimate.warehouseCity}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-clay-error/5 border border-clay-error/20">
                <p className="text-sm font-medium text-clay-error flex items-center gap-2">
                  <AlertCircle size={14} />
                  Not serviceable at this pincode
                </p>
                {estimate.deliveryNote && (
                  <p className="text-xs text-clay-text-muted mt-1">{estimate.deliveryNote}</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
