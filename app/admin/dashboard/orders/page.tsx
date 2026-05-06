'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { motion } from 'framer-motion'
import {
  Package, Truck, CheckCircle, Clock, XCircle, Search, ChevronLeft, ChevronRight,
  ArrowRight, Filter, CreditCard, ShoppingBag, RotateCcw, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const statusConfig: Record<string, { color: string; bg: string; accent: string; icon: React.ElementType }> = {
  PENDING:    { color: 'text-amber-400', bg: 'bg-amber-500/10', accent: '#f59e0b', icon: Clock },
  CONFIRMED:  { color: 'text-violet-400', bg: 'bg-violet-500/10', accent: '#8b5cf6', icon: CheckCircle },
  PROCESSING: { color: 'text-blue-400', bg: 'bg-blue-500/10', accent: '#3b82f6', icon: Package },
  SHIPPED:    { color: 'text-sky-400', bg: 'bg-sky-500/10', accent: '#0ea5e9', icon: Truck },
  DELIVERED:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', accent: '#10b981', icon: CheckCircle },
  CANCELLED:  { color: 'text-rose-400', bg: 'bg-rose-500/10', accent: '#f43f5e', icon: XCircle },
  RETURNED:   { color: 'text-orange-400', bg: 'bg-orange-500/10', accent: '#f97316', icon: RotateCcw },
}

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

interface Order {
  id: string; orderNumber: string; status: string; paymentStatus: string
  paymentMethod: string; total: number; itemCount: number; createdAt: string
  customer: { id: string; name: string | null; email: string | null }
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

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-500/10 text-emerald-400',
    PENDING: 'bg-amber-500/10 text-amber-400',
    FAILED: 'bg-rose-500/10 text-rose-400',
    REFUNDED: 'bg-orange-500/10 text-orange-400',
    PARTIALLY_REFUNDED: 'bg-orange-500/10 text-orange-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold ${map[status] || map.PENDING}`}>
      <CreditCard size={10} /> {status}
    </span>
  )
}

export default function OrdersManagement() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [updating, setUpdating] = useState<string | null>(null)

  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (search) params.set('search', search)
  if (statusFilter) params.set('status', statusFilter)
  const url = `/api/portal/orders?${params}`

  const { data, isLoading } = useSWR(url, fetcher)
  const orders: Order[] = data?.items ?? []
  const pagination = data?.pagination

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/portal/orders/${orderId}/status`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to update')
      }
      mutate(url)
      toast.success(`Order updated to ${newStatus}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status')
    } finally { setUpdating(null) }
  }

  const statusTabs = [
    { label: 'All Orders', status: null, icon: ShoppingBag, accent: 'var(--portal-accent)' },
    { label: 'Pending', status: 'PENDING', icon: Clock, accent: '#f59e0b' },
    { label: 'Confirmed', status: 'CONFIRMED', icon: CheckCircle, accent: '#8b5cf6' },
    { label: 'Processing', status: 'PROCESSING', icon: Package, accent: '#3b82f6' },
    { label: 'Shipped', status: 'SHIPPED', icon: Truck, accent: '#0ea5e9' },
    { label: 'Delivered', status: 'DELIVERED', icon: CheckCircle, accent: '#10b981' },
    { label: 'Cancelled', status: 'CANCELLED', icon: XCircle, accent: '#f43f5e' },
  ]

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--portal-text)' }}>Orders</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
              {pagination ? `${pagination.total.toLocaleString()} total orders` : 'Manage and fulfill customer orders'}
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => mutate(url)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
            <RefreshCw size={13} /> Refresh
          </motion.button>
        </motion.div>

        {/* Status filter tabs — horizontal scroll on mobile */}
        <motion.div variants={fadeUpVariants} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {statusTabs.map(tab => {
            const active = statusFilter === tab.status
            const TabIcon = tab.icon
            return (
              <motion.button key={tab.label} whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}
                onClick={() => { setStatusFilter(tab.status); setPage(1) }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? `${tab.accent}15` : 'var(--portal-surface)',
                  color: active ? tab.accent : 'var(--portal-muted)',
                  border: `1px solid ${active ? `${tab.accent}30` : 'var(--portal-border)'}`,
                }}>
                <TabIcon size={13} /> {tab.label}
              </motion.button>
            )
          })}
        </motion.div>

        {/* Search bar */}
        <motion.div variants={fadeUpVariants} className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
          <input placeholder="Search by order number, customer name, or email..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50 transition-shadow"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
        </motion.div>

        {/* Orders table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded-full animate-pulse" style={{ width: `${40 + Math.random() * 40}%`, background: 'var(--portal-elevated)' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-20 text-center">
                      <Package size={40} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--portal-muted)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--portal-muted)' }}>No orders found</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order, i) => {
                    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]
                    const isUpdating = updating === order.id
                    return (
                      <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--portal-border)' : undefined }}
                        className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3.5">
                          <Link href={`/admin/dashboard/orders/${order.id}`} className="text-sm font-bold font-mono hover:underline" style={{ color: 'var(--portal-accent)' }}>{order.orderNumber}</Link>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-accent)' }}>
                              {(order.customer?.name || 'G').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--portal-text)' }}>{order.customer?.name || 'Guest'}</p>
                              <p className="text-[10px] truncate" style={{ color: 'var(--portal-muted)' }}>{order.customer?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--portal-text)' }}>{order.itemCount}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--portal-text)' }}>{formatPrice(order.total)}</span>
                        </td>
                        <td className="px-4 py-3.5"><PaymentBadge status={order.paymentStatus} /></td>
                        <td className="px-4 py-3.5"><StatusBadge status={order.status} /></td>
                        <td className="px-4 py-3.5 text-xs tabular-nums" style={{ color: 'var(--portal-muted)' }}>
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-3.5">
                          {nextStatus && order.status !== 'CANCELLED' && (
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                              onClick={() => handleStatusUpdate(order.id, nextStatus)} disabled={isUpdating}
                              className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                              style={{ background: `${statusConfig[nextStatus]?.accent || 'var(--portal-accent)'}15`,
                                color: statusConfig[nextStatus]?.accent || 'var(--portal-accent)',
                                border: `1px solid ${statusConfig[nextStatus]?.accent || 'var(--portal-accent)'}25` }}>
                              {isUpdating ? <RefreshCw size={10} className="animate-spin" /> : <ArrowRight size={10} />}
                              {nextStatus}
                            </motion.button>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <motion.div variants={fadeUpVariants} className="flex items-center justify-between px-1">
            <p className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-xl disabled:opacity-20 transition-colors"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
                <ChevronLeft size={16} />
              </motion.button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, k) => {
                let pg = k + 1
                if (pagination.totalPages > 5) {
                  const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4))
                  pg = start + k
                }
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className="w-8 h-8 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: page === pg ? 'var(--portal-accent)' : 'transparent',
                      color: page === pg ? '#fff' : 'var(--portal-muted)',
                    }}>{pg}</button>
                )
              })}
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPage(p => p + 1)} disabled={!pagination.hasMore}
                className="p-2 rounded-xl disabled:opacity-20 transition-colors"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
                <ChevronRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}
