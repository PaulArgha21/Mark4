'use client'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Package, Truck, CheckCircle, Clock, XCircle, ArrowLeft, MapPin,
  CreditCard, RotateCcw, MessageSquare, ChevronRight, Copy, ExternalLink
} from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PENDING:    { color: 'text-amber-500',   icon: Clock,       label: 'Pending' },
  CONFIRMED:  { color: 'text-violet-500',  icon: CheckCircle, label: 'Confirmed' },
  PROCESSING: { color: 'text-blue-500',    icon: Package,     label: 'Processing' },
  SHIPPED:    { color: 'text-sky-500',     icon: Truck,       label: 'Shipped' },
  DELIVERED:  { color: 'text-emerald-500', icon: CheckCircle, label: 'Delivered' },
  CANCELLED:  { color: 'text-rose-500',    icon: XCircle,     label: 'Cancelled' },
  RETURNED:   { color: 'text-orange-500',  icon: RotateCcw,   label: 'Returned' },
}

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

interface OrderItem {
  id: string; productName: string; productSlug: string; variantInfo: string
  sku: string; quantity: number; unitPrice: number; totalPrice: number; discount: number; image: string | null
}

interface OrderData {
  id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: string
  subtotal: number; discount: number; shippingCost: number; tax: number; total: number
  notes: string | null; shippingAddress: Record<string, string> | null; createdAt: string
  items: OrderItem[]
  payment: { method: string; status: string; amount: number; paidAt: string } | null
  shipments: { id: string; carrier: string; trackingNumber: string; trackingUrl: string; status: string; estimatedDelivery: string | null }[]
  statusHistory: { status: string; note: string | null; createdAt: string }[]
  coupon: { code: string; discountType: string; discountValue: number } | null
  refunds: { id: string; amount: number; status: string; reason: string; createdAt: string }[]
  returnRequests: { id: string; reason: string; status: string; createdAt: string }[]
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: order, isLoading } = useSWR<OrderData>(`/api/storefront/orders/${id}`, fetcher)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="clay-card h-32 animate-shimmer rounded-2xl" />)}
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-16 clay-card rounded-2xl">
        <Package size={48} className="mx-auto text-clay-text-muted mb-3" strokeWidth={1} />
        <h3 className="font-semibold text-clay-text mb-2">Order not found</h3>
        <ClayButton variant="ghost" size="sm" onClick={() => router.push('/account/orders')}>
          Back to Orders
        </ClayButton>
      </div>
    )
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status)
  const isCancelled = order.status === 'CANCELLED' || order.status === 'RETURNED'
  const addr = order.shippingAddress as Record<string, string> | null

  return (
    <motion.div
      className="space-y-4 md:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
        <button onClick={() => router.push('/account/orders')} className="p-1.5 rounded-xl hover:bg-clay-bg-sunken transition-colors">
          <ArrowLeft size={20} className="text-clay-text" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-lg md:text-xl font-bold text-clay-text">
              #{order.orderNumber}
            </h2>
            <button
              onClick={() => { navigator.clipboard.writeText(order.orderNumber); toast.success('Copied!') }}
              className="text-clay-text-muted hover:text-clay-text"
            >
              <Copy size={14} />
            </button>
          </div>
          <p className="text-xs text-clay-text-muted">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <ClayBadge
          variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'sale' : 'info'}
          size="sm"
        >
          {statusConfig[order.status]?.label || order.status}
        </ClayBadge>
      </motion.div>

      {/* Status Tracker */}
      {!isCancelled && (
        <motion.div variants={fadeUpVariants} className="clay-card p-4 md:p-5 rounded-2xl">
          <h3 className="text-xs font-semibold text-clay-text-muted uppercase tracking-wider mb-4">Order Progress</h3>
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-clay-divider" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-clay-rose transition-all duration-500"
              style={{ width: `${Math.max(0, currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIndex
              const Icon = statusConfig[step]?.icon || Clock
              return (
                <div key={step} className="relative flex flex-col items-center z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                      done ? 'bg-clay-rose text-white' : 'bg-clay-bg-sunken text-clay-text-muted'
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium ${done ? 'text-clay-text' : 'text-clay-text-muted'}`}>
                    {statusConfig[step]?.label}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Items */}
      <motion.div variants={fadeUpVariants} className="clay-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-clay-divider">
          <h3 className="text-sm font-semibold text-clay-text">{order.items.length} Item{order.items.length > 1 ? 's' : ''}</h3>
        </div>
        <div className="divide-y divide-clay-divider">
          {order.items.map(item => (
            <Link key={item.id} href={`/product/${item.productSlug}`} className="flex items-center gap-3 p-4 hover:bg-clay-bg-sunken/30 transition-colors">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-clay-bg-sunken">
                {item.image ? (
                  <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-clay-text-muted" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-clay-text line-clamp-1">{item.productName}</p>
                <p className="text-xs text-clay-text-muted mt-0.5">{item.variantInfo} {item.sku && `· ${item.sku}`}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-clay-text">{formatPrice(item.unitPrice)}</span>
                  <span className="text-xs text-clay-text-muted">× {item.quantity}</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-clay-text-muted flex-shrink-0" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Price Summary */}
      <motion.div variants={fadeUpVariants} className="clay-card p-4 rounded-2xl space-y-2">
        <h3 className="text-sm font-semibold text-clay-text mb-3">Price Details</h3>
        <div className="flex justify-between text-sm"><span className="text-clay-text-secondary">Subtotal</span><span className="text-clay-text">{formatPrice(order.subtotal)}</span></div>
        {order.discount > 0 && (
          <div className="flex justify-between text-sm"><span className="text-emerald-600">Discount{order.coupon ? ` (${order.coupon.code})` : ''}</span><span className="text-emerald-600">−{formatPrice(order.discount)}</span></div>
        )}
        <div className="flex justify-between text-sm"><span className="text-clay-text-secondary">Shipping</span><span className="text-clay-text">{order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Free'}</span></div>
        {order.tax > 0 && (
          <div className="flex justify-between text-sm"><span className="text-clay-text-secondary">Tax</span><span className="text-clay-text">{formatPrice(order.tax)}</span></div>
        )}
        <div className="border-t border-clay-divider pt-2 flex justify-between">
          <span className="font-semibold text-clay-text">Total</span>
          <span className="font-bold text-clay-text text-lg">{formatPrice(order.total)}</span>
        </div>
      </motion.div>

      {/* Shipping Info */}
      {addr && (
        <motion.div variants={fadeUpVariants} className="clay-card p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-clay-rose" />
            <h3 className="text-sm font-semibold text-clay-text">Delivery Address</h3>
          </div>
          <p className="text-sm text-clay-text-secondary leading-relaxed">
            {addr.name && <span className="font-medium text-clay-text block">{addr.name}</span>}
            {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
            {addr.city}, {addr.state} {addr.pincode}<br />
            {addr.phone && <span className="text-clay-text-muted">Phone: {addr.phone}</span>}
          </p>
        </motion.div>
      )}

      {/* Shipment Tracking */}
      {order.shipments.length > 0 && (
        <motion.div variants={fadeUpVariants} className="clay-card p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={16} className="text-clay-rose" />
            <h3 className="text-sm font-semibold text-clay-text">Tracking</h3>
          </div>
          {order.shipments.map(s => (
            <div key={s.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-clay-text">{s.carrier || 'Carrier'}</p>
                  <p className="text-xs text-clay-text-muted">{s.trackingNumber}</p>
                </div>
                <ClayBadge variant="info" size="sm">{s.status.replace(/_/g, ' ')}</ClayBadge>
              </div>
              {s.trackingUrl && (
                <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-clay-rose font-medium">
                  Track Package <ExternalLink size={12} />
                </a>
              )}
              {s.estimatedDelivery && (
                <p className="text-xs text-clay-text-muted">
                  Est. delivery: {new Date(s.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Payment */}
      {order.payment && (
        <motion.div variants={fadeUpVariants} className="clay-card p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-clay-rose" />
            <h3 className="text-sm font-semibold text-clay-text">Payment</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-clay-text">{order.payment.method || order.paymentMethod || 'N/A'}</p>
              <p className="text-xs text-clay-text-muted">
                {new Date(order.payment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <ClayBadge variant={order.payment.status === 'PAID' ? 'success' : 'default'} size="sm">
              {order.payment.status}
            </ClayBadge>
          </div>
        </motion.div>
      )}

      {/* Order Timeline */}
      {order.statusHistory.length > 0 && (
        <motion.div variants={fadeUpVariants} className="clay-card p-4 rounded-2xl">
          <h3 className="text-sm font-semibold text-clay-text mb-3">Order Timeline</h3>
          <div className="space-y-3">
            {order.statusHistory.map((h, i) => {
              const cfg = statusConfig[h.status]
              const Icon = cfg?.icon || Clock
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-clay-rose text-white' : 'bg-clay-bg-sunken text-clay-text-muted'}`}>
                    <Icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-clay-text">{cfg?.label || h.status}</p>
                    {h.note && <p className="text-xs text-clay-text-muted mt-0.5">{h.note}</p>}
                    <p className="text-[10px] text-clay-text-muted mt-0.5">
                      {new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-2">
        <Link href={`/account/help?orderId=${order.id}&orderNumber=${order.orderNumber}`} className="flex-1">
          <ClayButton variant="secondary" className="w-full !rounded-xl">
            <MessageSquare size={16} className="mr-2" /> Get Help
          </ClayButton>
        </Link>
      </motion.div>
    </motion.div>
  )
}
