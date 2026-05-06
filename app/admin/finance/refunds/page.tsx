'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search, X, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { CredentialGate } from '@/components/portal/shared/CredentialGate'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, scaleInVariants } from '@/lib/animations'
import { toast } from 'sonner'

interface RefundItem {
  id: string; orderId: string; orderNumber: string; amount: number; orderTotal: number
  reason: string | null; status: string; razorpayRefundId: string | null; notes: string | null
  customer: { id: string; name: string | null; email: string } | null
  createdAt: string; processedAt: string | null
}
interface StatusSummary { status: string; count: number; totalAmount: number }

const statusIcons: Record<string, typeof Clock> = { PENDING: Clock, PROCESSING: AlertTriangle, COMPLETED: CheckCircle2, FAILED: XCircle }
const statusColors: Record<string, string> = { PENDING: '#f08c00', PROCESSING: '#339af0', COMPLETED: '#2f9e44', FAILED: '#e03131' }

export default function RefundsPage() {
  const [items, setItems] = useState<RefundItem[]>([])
  const [statusSummary, setStatusSummary] = useState<StatusSummary[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [processModal, setProcessModal] = useState<RefundItem | null>(null)
  const [processing, setProcessing] = useState(false)
  const [needsElevation, setNeedsElevation] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '15', status: filter })
    if (search) params.set('search', search)
    fetch(`/api/portal/finance/refunds?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setItems(d.data.items ?? [])
          setStatusSummary(d.data.statusSummary ?? [])
          setTotalPages(d.data.pagination?.totalPages ?? 1)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filter, search])

  useEffect(() => { fetchData() }, [fetchData])

  const processRefund = async (method: 'ORIGINAL' | 'STORE_CREDIT', notes: string) => {
    if (!processModal) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/portal/finance/refunds/${processModal.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, notes }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Refund ${method === 'ORIGINAL' ? 'initiated via Razorpay' : 'issued as store credit'}`)
        setProcessModal(null)
        fetchData()
      } else if (res.status === 403) {
        setNeedsElevation(true)
      } else {
        toast.error(data.error?.message ?? 'Failed to process refund')
      }
    } catch { toast.error('Network error') }
    finally { setProcessing(false) }
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <Link href="/admin/finance" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Refund Management</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Process and track customer refunds</p>
          </div>
        </motion.div>

        {/* Status summary cards */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].map(status => {
            const s = statusSummary.find(ss => ss.status === status)
            const Icon = statusIcons[status] ?? Clock
            return (
              <button key={status} onClick={() => { setFilter(filter === status ? 'all' : status); setPage(1) }}
                className="p-4 rounded-2xl text-left transition-all"
                style={{ background: 'var(--portal-surface)', border: `1px solid ${filter === status ? statusColors[status] : 'var(--portal-border)'}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} style={{ color: statusColors[status] }} />
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--portal-muted)' }}>{status}</span>
                </div>
                <p className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>{s?.count ?? 0}</p>
                <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{formatPrice(s?.totalAmount ?? 0)}</p>
              </button>
            )
          })}
        </motion.div>

        {/* Search */}
        <motion.div variants={fadeUpVariants} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by order number, customer name or email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
            style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}
          />
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['Order', 'Customer', 'Amount', 'Reason', 'Status', 'Date', 'Action'].map(h => (
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
                )) : items.map(r => {
                  const Icon = statusIcons[r.status] ?? Clock
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--portal-border)' }} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--portal-accent)' }}>{r.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>{r.customer?.name ?? 'N/A'}</p>
                        <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{r.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>{formatPrice(r.amount)}</td>
                      <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: 'var(--portal-muted)' }}>{r.reason ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: `${statusColors[r.status]}15`, color: statusColors[r.status] }}>
                          <Icon size={10} /> {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {r.status === 'PENDING' && (
                          <button onClick={() => setProcessModal(r)}
                            className="px-3 py-1 rounded-lg text-[10px] font-semibold"
                            style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                            Process
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--portal-border)' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded text-xs disabled:opacity-30" style={{ color: 'var(--portal-muted)' }}>Previous</button>
              <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded text-xs disabled:opacity-30" style={{ color: 'var(--portal-muted)' }}>Next</button>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Process Modal */}
      <AnimatePresence>
        {processModal && !needsElevation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div variants={scaleInVariants} initial="hidden" animate="visible" exit="hidden"
              className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Process Refund</h3>
                <button onClick={() => setProcessModal(null)}><X size={18} style={{ color: 'var(--portal-muted)' }} /></button>
              </div>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--portal-muted)' }}>Order</span>
                  <span className="font-mono" style={{ color: 'var(--portal-accent)' }}>{processModal.orderNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--portal-muted)' }}>Amount</span>
                  <span className="font-bold" style={{ color: 'var(--portal-text)' }}>{formatPrice(processModal.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--portal-muted)' }}>Reason</span>
                  <span style={{ color: 'var(--portal-text)' }}>{processModal.reason ?? 'Not specified'}</span>
                </div>
                {processModal.amount > 5000 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#f08c0015', border: '1px solid #f08c0030' }}>
                    <AlertTriangle size={14} style={{ color: '#f08c00' }} />
                    <span className="text-xs" style={{ color: '#f08c00' }}>High-value refund — credential elevation required</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => processRefund('ORIGINAL', '')} disabled={processing}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                  {processing ? 'Processing...' : 'Refund to Payment'}
                </button>
                <button onClick={() => processRefund('STORE_CREDIT', '')} disabled={processing}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  style={{ background: 'transparent', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}>
                  {processing ? 'Processing...' : 'Store Credit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Credential elevation gate */}
      {needsElevation && (
        <CredentialGate action="process high-value refund" onSuccess={() => { setNeedsElevation(false); if (processModal) processRefund('ORIGINAL', '') }} onCancel={() => setNeedsElevation(false)} />
      )}
    </PortalShell>
  )
}
