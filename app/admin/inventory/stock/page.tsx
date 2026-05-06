'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search, X, Package, Edit3 } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, scaleInVariants } from '@/lib/animations'
import { toast } from 'sonner'

interface StockItem {
  id: string; variantId: string; sku: string; productId: string; productName: string
  brand: string | null; size: string | null; color: string | null; colorHex: string | null
  quantity: number; reserved: number; available: number
  lowStockThreshold: number; isLowStock: boolean; isOutOfStock: boolean; updatedAt: string
}

export default function StockManagementPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null)
  const [newQty, setNewQty] = useState('')
  const [reason, setReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', filter, sort })
    if (search) params.set('search', search)
    fetch(`/api/portal/inventory?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setItems(d.data.items ?? [])
          setTotalPages(d.data.pagination?.totalPages ?? 1)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, filter, sort, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdjust = async () => {
    if (!adjustItem || !newQty || !reason.trim()) { toast.error('Fill all fields'); return }
    setAdjusting(true)
    try {
      const res = await fetch(`/api/portal/inventory/${adjustItem.variantId}/adjust`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newQty: parseInt(newQty), reason }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Stock updated: ${adjustItem.sku} → ${newQty} (delta: ${data.data?.delta ?? '?'})`)
        setAdjustItem(null)
        setNewQty('')
        setReason('')
        fetchData()
      } else {
        toast.error(data.error?.message ?? 'Adjustment failed')
      }
    } catch { toast.error('Network error') }
    finally { setAdjusting(false) }
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'overstocked', label: 'Overstocked' },
  ]

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <Link href="/admin/inventory" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Stock Management</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>View and adjust inventory levels</p>
          </div>
        </motion.div>

        {/* Filters + Search */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search SKU or product name..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
              style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
          </div>
          <div className="flex gap-2">
            {filters.map(f => (
              <button key={f.value} onClick={() => { setFilter(f.value); setPage(1) }}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
                style={{ background: filter === f.value ? 'var(--portal-accent)' : 'transparent', color: filter === f.value ? '#fff' : 'var(--portal-muted)', border: `1px solid ${filter === f.value ? 'var(--portal-accent)' : 'var(--portal-border)'}` }}>
                {f.label}
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
                  {['SKU', 'Product', 'Variant', 'Qty', 'Reserved', 'Available', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 w-14 rounded bg-white/10 animate-pulse" /></td>
                    ))}
                  </tr>
                )) : items.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No inventory items found</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--portal-border)' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--portal-muted)' }}>{item.sku}</td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{item.productName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {item.colorHex && <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: item.colorHex }} />}
                        <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>{[item.color, item.size].filter(Boolean).join(' / ') || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--portal-text)' }}>{item.quantity}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--portal-muted)' }}>{item.reserved}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: item.available <= 0 ? '#e03131' : 'var(--portal-text)' }}>{item.available}</td>
                    <td className="px-4 py-3">
                      {item.isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400">Out of Stock</span>
                      ) : item.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400">In Stock</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setAdjustItem(item); setNewQty(String(item.quantity)) }}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--portal-accent)' }}>
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* Adjust Modal */}
      <AnimatePresence>
        {adjustItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div variants={scaleInVariants} initial="hidden" animate="visible" exit="hidden"
              className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Adjust Stock</h3>
                <button onClick={() => setAdjustItem(null)}><X size={18} style={{ color: 'var(--portal-muted)' }} /></button>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--portal-bg)' }}>
                  <Package size={16} style={{ color: 'var(--portal-accent)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{adjustItem.productName}</p>
                    <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{adjustItem.sku} &middot; {[adjustItem.color, adjustItem.size].filter(Boolean).join(' / ')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Current</p><p className="font-bold" style={{ color: 'var(--portal-text)' }}>{adjustItem.quantity}</p></div>
                  <div><p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Reserved</p><p className="font-bold" style={{ color: 'var(--portal-text)' }}>{adjustItem.reserved}</p></div>
                  <div><p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Available</p><p className="font-bold" style={{ color: adjustItem.available <= 0 ? '#e03131' : 'var(--portal-text)' }}>{adjustItem.available}</p></div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>New Quantity</label>
                  <input type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                    style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                  {newQty && (
                    <p className="text-xs mt-1" style={{ color: parseInt(newQty) > adjustItem.quantity ? '#2f9e44' : parseInt(newQty) < adjustItem.quantity ? '#e03131' : 'var(--portal-muted)' }}>
                      Delta: {parseInt(newQty) - adjustItem.quantity >= 0 ? '+' : ''}{parseInt(newQty) - adjustItem.quantity}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Reason *</label>
                  <select value={reason} onChange={e => setReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                    style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
                    <option value="">Select reason</option>
                    <option value="Manual count correction">Manual count correction</option>
                    <option value="Damaged/defective stock">Damaged/defective stock</option>
                    <option value="Restock from supplier">Restock from supplier</option>
                    <option value="Returned item">Returned item</option>
                    <option value="Inventory audit">Inventory audit</option>
                    <option value="Promotional allocation">Promotional allocation</option>
                  </select>
                </div>
                <button onClick={handleAdjust} disabled={adjusting || !newQty || !reason}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                  {adjusting ? 'Updating...' : 'Update Stock'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalShell>
  )
}
