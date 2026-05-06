'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search, FileText, Clock, CheckCircle2, Truck, XCircle, Package } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

interface PO { id: string; poNumber: string; supplier: { id: string; name: string } | null; status: string; itemCount: number; totalCost: number; expectedDate: string | null; receivedDate: string | null; createdAt: string }

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  DRAFT: { icon: FileText, color: '#6c757d' }, SENT: { icon: Truck, color: '#339af0' },
  CONFIRMED: { icon: CheckCircle2, color: '#7950f2' }, PARTIALLY_RECEIVED: { icon: Package, color: '#f08c00' },
  RECEIVED: { icon: CheckCircle2, color: '#2f9e44' }, CANCELLED: { icon: XCircle, color: '#e03131' },
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '15' })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    fetch(`/api/portal/inventory/purchase-orders?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setOrders(d.data.items ?? [])
          setTotalPages(d.data.pagination?.totalPages ?? 1)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search, status])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <Link href="/admin/inventory" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Purchase Orders</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Track supplier orders and receiving</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search PO number or supplier..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
              style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['', 'DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED'].map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                className="px-3 py-2 rounded-xl text-[10px] font-medium transition-colors whitespace-nowrap"
                style={{ background: status === s ? 'var(--portal-accent)' : 'transparent', color: status === s ? '#fff' : 'var(--portal-muted)', border: `1px solid ${status === s ? 'var(--portal-accent)' : 'var(--portal-border)'}` }}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['PO Number', 'Supplier', 'Status', 'Items', 'Total Cost', 'Expected', 'Created'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 w-16 rounded bg-white/10 animate-pulse" /></td>
                    ))}
                  </tr>
                )) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No purchase orders found</td></tr>
                ) : orders.map(po => {
                  const cfg = statusConfig[po.status] ?? statusConfig.DRAFT
                  const Icon = cfg.icon
                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--portal-border)' }} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: 'var(--portal-accent)' }}>{po.poNumber}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--portal-text)' }}>{po.supplier?.name ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: `${cfg.color}15`, color: cfg.color }}>
                          <Icon size={10} /> {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--portal-text)' }}>{po.itemCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>{formatPrice(po.totalCost)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--portal-border)' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded text-xs disabled:opacity-30" style={{ color: 'var(--portal-muted)' }}>Previous</button>
              <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded text-xs disabled:opacity-30" style={{ color: 'var(--portal-muted)' }}>Next</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </PortalShell>
  )
}
