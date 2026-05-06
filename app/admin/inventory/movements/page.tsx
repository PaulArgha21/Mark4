'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

interface Movement { id: string; variantId: string; sku: string; productName: string; variant: string; type: string; quantity: number; reference: string | null; notes: string | null; createdAt: string }

export default function MovementsPage() {
  const [items, setItems] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (type) params.set('type', type)
    fetch(`/api/portal/inventory/movements?${params}`)
      .then(r => r.json())
      .then(d => { if (d.data) { setItems(d.data.items ?? []); setTotalPages(d.data.pagination?.totalPages ?? 1) } })
      .catch(() => {}).finally(() => setLoading(false))
  }, [page, type])

  useEffect(() => { fetchData() }, [fetchData])

  const typeColors: Record<string, string> = { PURCHASE: '#2f9e44', SALE: '#e03131', ADJUSTMENT: '#f08c00', RETURN: '#339af0', TRANSFER: '#7950f2', RESERVED: '#868e96', RELEASED: '#20c997' }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <Link href="/admin/inventory" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Movement History</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>All stock changes across inventory</p>
          </div>
        </motion.div>

        {/* Type filters */}
        <motion.div variants={fadeUpVariants} className="flex gap-2 flex-wrap">
          {['', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'TRANSFER'].map(t => (
            <button key={t} onClick={() => { setType(t); setPage(1) }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{ background: type === t ? (typeColors[t] ?? 'var(--portal-accent)') : 'transparent', color: type === t ? '#fff' : 'var(--portal-muted)', border: `1px solid ${type === t ? 'transparent' : 'var(--portal-border)'}` }}>
              {t || 'All Types'}
            </button>
          ))}
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['Date', 'Type', 'SKU', 'Product', 'Qty', 'Reference', 'Notes'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-3 w-14 rounded bg-white/10 animate-pulse" /></td>))}
                  </tr>
                )) : items.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No movements found</td></tr>
                ) : items.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--portal-border)' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: `${typeColors[m.type] ?? '#6c757d'}15`, color: typeColors[m.type] ?? '#6c757d' }}>
                        {m.quantity > 0 ? <ArrowUpCircle size={10} /> : m.quantity < 0 ? <ArrowDownCircle size={10} /> : <RefreshCw size={10} />}
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--portal-muted)' }}>{m.sku}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>{m.productName}</p>
                      {m.variant && <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{m.variant}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: m.quantity > 0 ? '#2f9e44' : m.quantity < 0 ? '#e03131' : 'var(--portal-text)' }}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>{m.reference ?? '-'}</td>
                    <td className="px-4 py-3 text-xs max-w-[150px] truncate" style={{ color: 'var(--portal-muted)' }}>{m.notes ?? '-'}</td>
                  </tr>
                ))}
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
