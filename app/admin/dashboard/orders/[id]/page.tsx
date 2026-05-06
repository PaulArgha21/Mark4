'use client'
import { useParams, useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Truck, CheckCircle, Clock, XCircle, ArrowLeft, MapPin,
  CreditCard, RotateCcw, MessageSquare, User, Hash, ExternalLink, ChevronDown
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  PENDING:    { color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Clock },
  CONFIRMED:  { color: 'text-violet-400',  bg: 'bg-violet-500/10',  icon: CheckCircle },
  PROCESSING: { color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: Package },
  SHIPPED:    { color: 'text-sky-400',     bg: 'bg-sky-500/10',     icon: Truck },
  DELIVERED:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle },
  CANCELLED:  { color: 'text-rose-400',    bg: 'bg-rose-500/10',    icon: XCircle },
  RETURNED:   { color: 'text-orange-400',  bg: 'bg-orange-500/10',  icon: RotateCcw },
}

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

interface OrderData {
  id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: string
  subtotal: number; discount: number; shippingCost: number; tax: number; total: number
  notes: string | null; shippingAddress: Record<string, string> | null; billingAddress: Record<string, string> | null
  createdAt: string; updatedAt: string
  customer: { id: string; name: string; email: string; phone: string; memberSince: string }
  items: { id: string; productName: string; productSlug: string; variantInfo: string; sku: string; quantity: number; unitPrice: number; totalPrice: number; discount: number; currentStock: number; image: string | null }[]
  payments: { id: string; razorpayPaymentId: string | null; method: string; status: string; amount: number; failureReason: string | null; createdAt: string }[]
  shipments: { id: string; carrier: string; trackingNumber: string; trackingUrl: string; status: string; estimatedDelivery: string | null; deliveredAt: string | null; createdAt: string }[]
  statusHistory: { status: string; note: string | null; changedBy: string | null; createdAt: string }[]
  coupon: { code: string; discountType: string; discountValue: number } | null
  refunds: { id: string; amount: number; status: string; reason: string; notes: string | null; processedAt: string | null; createdAt: string }[]
  returnRequests: { id: string; reason: string; status: string; items: { productName: string; quantity: number }[]; createdAt: string }[]
  supportTickets: { id: string; subject: string; status: string; priority: string; replyCount: number; createdAt: string }[]
}

function StatusBadge({ status }: { status: string }) {
  const c = statusConfig[status] || statusConfig.PENDING
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold ${c.bg} ${c.color}`}>
      <Icon size={10} /> {status}
    </span>
  )
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: order, isLoading, mutate: mutateOrder } = useSWR<OrderData>(`/api/portal/orders/${id}`, fetcher)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const handleStatusUpdate = async () => {
    if (!newStatus) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/portal/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, note: statusNote || undefined }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Failed') }
      toast.success(`Status updated to ${newStatus}`)
      mutateOrder()
      mutate('/api/portal/orders')
      setNewStatus('')
      setStatusNote('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally { setUpdatingStatus(false) }
  }

  return (
    <PortalShell>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !order ? (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto text-white/20 mb-4" strokeWidth={1} />
          <p className="text-white/50">Order not found</p>
        </div>
      ) : (
        <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={fadeUpVariants} className="flex items-center gap-4 flex-wrap">
            <button onClick={() => router.push('/admin/dashboard/orders')} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <ArrowLeft size={20} className="text-white/60" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Hash size={20} className="text-white/40" />{order.orderNumber}
              </h1>
              <p className="text-sm text-white/40 mt-0.5">
                Placed {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Items */}
              <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white">{order.items.length} Item{order.items.length > 1 ? 's' : ''}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {order.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-4">
                      <div className="relative w-14 h-18 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                        {item.image ? (
                          <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="56px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package size={18} className="text-white/20" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.productName}</p>
                        <p className="text-xs text-white/40">{item.variantInfo} · SKU: {item.sku || 'N/A'}</p>
                        <p className="text-xs text-white/30 mt-0.5">Stock: {item.currentStock}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-white">{formatPrice(item.unitPrice)}</p>
                        <p className="text-[10px] text-white/40">× {item.quantity}</p>
                        <p className="text-xs text-white/60">{formatPrice(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Price summary in items card */}
                <div className="p-4 border-t border-white/10 space-y-1.5 bg-white/[0.02]">
                  <div className="flex justify-between text-sm"><span className="text-white/40">Subtotal</span><span className="text-white">{formatPrice(order.subtotal)}</span></div>
                  {order.discount > 0 && <div className="flex justify-between text-sm"><span className="text-emerald-400">Discount{order.coupon ? ` (${order.coupon.code})` : ''}</span><span className="text-emerald-400">−{formatPrice(order.discount)}</span></div>}
                  <div className="flex justify-between text-sm"><span className="text-white/40">Shipping</span><span className="text-white">{order.shippingCost > 0 ? formatPrice(order.shippingCost) : 'Free'}</span></div>
                  {order.tax > 0 && <div className="flex justify-between text-sm"><span className="text-white/40">Tax</span><span className="text-white">{formatPrice(order.tax)}</span></div>}
                  <div className="border-t border-white/10 pt-2 flex justify-between"><span className="font-semibold text-white">Total</span><span className="font-bold text-white text-lg">{formatPrice(order.total)}</span></div>
                </div>
              </motion.div>

              {/* Timeline */}
              <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-white mb-4">Order Timeline</h3>
                <div className="space-y-3">
                  {order.statusHistory.map((h, i) => {
                    const cfg = statusConfig[h.status] || statusConfig.PENDING
                    const Icon = cfg.icon
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <Icon size={12} className={cfg.color} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{h.status}</p>
                          {h.note && <p className="text-xs text-white/40 mt-0.5">{h.note}</p>}
                          <p className="text-[10px] text-white/30 mt-0.5">
                            {new Date(h.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Support Tickets */}
              {order.supportTickets.length > 0 && (
                <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare size={14} /> Support Tickets ({order.supportTickets.length})
                  </h3>
                  <div className="space-y-2">
                    {order.supportTickets.map(t => (
                      <Link
                        key={t.id}
                        href={`/admin/dashboard/support/${t.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div>
                          <p className="text-sm text-white">{t.subject}</p>
                          <p className="text-[10px] text-white/40">{t.replyCount} replies · {t.priority}</p>
                        </div>
                        <StatusBadge status={t.status} />
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Refunds */}
              {order.refunds.length > 0 && (
                <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Refunds</h3>
                  <div className="space-y-2">
                    {order.refunds.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div>
                          <p className="text-sm text-white">{formatPrice(r.amount)}</p>
                          <p className="text-xs text-white/40">{r.reason || 'No reason'}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Update Status */}
              <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Update Status</h3>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 mb-2"
                >
                  <option value="">Select new status...</option>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s} disabled={s === order.status}>{s}</option>
                  ))}
                </select>
                <input
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 mb-3"
                />
                <button
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updatingStatus}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 rounded-xl text-sm font-semibold text-white transition-colors"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </motion.div>

              {/* Customer */}
              <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><User size={14} /> Customer</h3>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">{order.customer.name || 'N/A'}</p>
                  <p className="text-xs text-white/40">{order.customer.email}</p>
                  {order.customer.phone && <p className="text-xs text-white/40">{order.customer.phone}</p>}
                  <p className="text-[10px] text-white/30">Member since {new Date(order.customer.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                </div>
              </motion.div>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><MapPin size={14} /> Shipping</h3>
                  {(() => {
                    const a = order.shippingAddress as Record<string, string>
                    return (
                      <div className="text-sm text-white/60 leading-relaxed">
                        {a.name && <p className="text-white font-medium">{a.name}</p>}
                        <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                        <p>{a.city}, {a.state} {a.pincode}</p>
                        {a.phone && <p className="text-white/40">{a.phone}</p>}
                      </div>
                    )
                  })()}
                </motion.div>
              )}

              {/* Payment */}
              {order.payments.length > 0 && (
                <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><CreditCard size={14} /> Payment</h3>
                  {order.payments.map(p => (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-sm text-white">{p.method || 'N/A'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/40">{formatPrice(Number(p.amount))}</p>
                      {p.razorpayPaymentId && <p className="text-[10px] text-white/30 font-mono">RZP: {p.razorpayPaymentId}</p>}
                      {p.failureReason && <p className="text-xs text-rose-400">{p.failureReason}</p>}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Shipments */}
              {order.shipments.length > 0 && (
                <motion.div variants={fadeUpVariants} className="rounded-2xl border border-white/10 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Truck size={14} /> Shipments</h3>
                  {order.shipments.map(s => (
                    <div key={s.id} className="space-y-1.5">
                      <p className="text-sm text-white">{s.carrier || 'Carrier'} · {s.trackingNumber || 'No tracking'}</p>
                      <StatusBadge status={s.status} />
                      {s.trackingUrl && (
                        <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
                          Track <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </PortalShell>
  )
}
