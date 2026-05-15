'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Search, X, Package, Edit3, ExternalLink,
  MapPin, Warehouse, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, scaleInVariants } from '@/lib/animations'
import { toast } from 'sonner'

interface StockItem {
  id: string; variantId: string; sku: string; productId: string; productName: string; productSlug: string
  brand: string | null; size: string | null; color: string | null; colorHex: string | null
  quantity: number; reserved: number; available: number
  lowStockThreshold: number; isLowStock: boolean; isOutOfStock: boolean
  variantPrice: number; compareAtPrice: number | null; costPrice: number | null
  warehouseId: string | null; warehouseName: string | null; warehousePincode: string | null; warehouseCity: string | null
  updatedAt: string
}

function formatPrice(n: number) { return `₹${n.toLocaleString('en-IN')}` }

export default function StockManagementPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [adjustItem, setAdjustItem] = useState<StockItem | null>(null)
  const [newQty, setNewQty] = useState('')
  const [reason, setReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '25', filter, sort })
    if (search) params.set('search', search)
    fetch(`/api/portal/inventory?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setItems(d.data.items ?? [])
          setTotal(d.data.pagination?.total ?? 0)
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
      const body: Record<string, unknown> = { newQty: parseInt(newQty), reason }
      if (adjustItem.warehouseId) body.warehouseId = adjustItem.warehouseId
      const res = await fetch(`/api/portal/inventory/${adjustItem.variantId}/adjust`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Stock updated: ${adjustItem.sku} → ${newQty} (delta: ${data.data?.delta ?? '?'})`)
        setAdjustItem(null); setNewQty(''); setReason('')
        fetchData()
      } else {
        toast.error(data.error?.message ?? data.message ?? 'Adjustment failed')
      }
    } catch { toast.error('Network error') }
    finally { setAdjusting(false) }
  }

  const filters = [
    { value: 'all', label: 'All Items' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'overstocked', label: 'Overstocked' },
  ]

  const sortOptions = [
    { value: 'updated', label: 'Recently Updated' },
    { value: 'quantity_asc', label: 'Qty: Low → High' },
    { value: 'quantity_desc', label: 'Qty: High → Low' },
    { value: 'product', label: 'Product Name' },
    { value: 'sku', label: 'SKU' },
  ]

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-5">
        {/* Header */}
        <motion.div variants={fadeUpVariants}>
          <div className="flex items-center justify-between flex-wrap gap-3 p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <div className="flex items-center gap-3">
              <Link href="/admin/inventory" className="p-2.5 rounded-xl transition-all hover:scale-105" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>
                <ArrowLeft size={18} />
              </Link>
              <div>
                <h1 className="font-display text-xl font-bold" style={{ color: 'var(--portal-text)' }}>Stock Management</h1>
                <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                  {total} inventory entries across all warehouses
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeUpVariants} className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by SKU, product name, or brand..."
              className="portal-input pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setPage(1) }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: filter === f.value ? 'var(--portal-accent)' : 'var(--portal-elevated)',
                  color: filter === f.value ? '#fff' : 'var(--portal-muted)',
                  border: `1px solid ${filter === f.value ? 'var(--portal-accent)' : 'var(--portal-border)'}`,
                }}
              >
                {f.label}
              </button>
            ))}
            <select
              value={sort}
              onChange={e => { setSort(e.target.value); setPage(1) }}
              className="portal-input-sm"
              style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
            >
              {sortOptions.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['Product / SKU', 'Variant', 'Warehouse', 'Price', 'Qty', 'Reserved', 'Avail', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 w-14 rounded bg-white/10 animate-pulse" /></td>
                    ))}
                  </tr>
                )) : items.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-16 text-center">
                    <Package size={32} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)', opacity: 0.4 }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--portal-muted)' }}>No inventory items found</p>
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--portal-border)' }} className="hover:bg-white/[0.02] transition-colors">
                    {/* Product / SKU */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/dashboard/products/${item.productId}/edit`}
                        className="group"
                      >
                        <p className="text-sm font-medium group-hover:underline" style={{ color: 'var(--portal-text)' }}>
                          {item.productName}
                        </p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>
                          {item.sku}
                          {item.brand && <span className="ml-2 font-sans">{item.brand}</span>}
                        </p>
                      </Link>
                    </td>
                    {/* Variant */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {item.colorHex && (
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" style={{ background: item.colorHex }} />
                        )}
                        <span className="text-xs" style={{ color: 'var(--portal-text)' }}>
                          {[item.color, item.size].filter(Boolean).join(' / ') || '-'}
                        </span>
                      </div>
                    </td>
                    {/* Warehouse */}
                    <td className="px-4 py-3">
                      {item.warehouseName ? (
                        <div className="flex items-start gap-1.5">
                          <Warehouse size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--portal-muted)' }} />
                          <div>
                            <p className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>{item.warehouseName}</p>
                            {item.warehousePincode && (
                              <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--portal-muted)' }}>
                                <MapPin size={8} />{item.warehousePincode}
                                {item.warehouseCity && <span>· {item.warehouseCity}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>—</span>
                      )}
                    </td>
                    {/* Price */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold font-mono" style={{ color: 'var(--portal-text)' }}>
                        {formatPrice(item.variantPrice)}
                      </p>
                      {item.compareAtPrice && item.compareAtPrice > item.variantPrice && (
                        <p className="text-[10px] line-through" style={{ color: 'var(--portal-muted)' }}>
                          {formatPrice(item.compareAtPrice)}
                        </p>
                      )}
                    </td>
                    {/* Qty */}
                    <td className="px-4 py-3 text-sm font-bold font-mono" style={{ color: 'var(--portal-text)' }}>{item.quantity}</td>
                    {/* Reserved */}
                    <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--portal-muted)' }}>{item.reserved}</td>
                    {/* Available */}
                    <td className="px-4 py-3 text-sm font-bold font-mono" style={{ color: item.available <= 0 ? '#e03131' : '#4ade80' }}>{item.available}</td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      {item.isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 text-red-400">OOS</span>
                      ) : item.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/10 text-orange-400">LOW</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400">OK</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setAdjustItem(item); setNewQty(String(item.quantity)) }}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--portal-accent)' }}
                          title="Adjust stock"
                        >
                          <Edit3 size={14} />
                        </button>
                        <Link
                          href={`/admin/inventory/product/${item.productId}`}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--portal-muted)' }}
                          title="Inventory detail"
                        >
                          <Package size={14} />
                        </Link>
                        <Link
                          href={`/admin/dashboard/products/${item.productId}/edit`}
                          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                          style={{ color: 'var(--portal-muted)' }}
                          title="Edit product"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--portal-border)' }}>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                Page {page} of {totalPages} ({total} entries)
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                  style={{ color: 'var(--portal-muted)' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors"
                  style={{ color: 'var(--portal-muted)' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ═══ Adjust Stock Modal ═══ */}
      <AnimatePresence>
        {adjustItem && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div variants={scaleInVariants} initial="hidden" animate="visible" exit="hidden"
              className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Adjust Stock</h3>
                <button onClick={() => setAdjustItem(null)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <X size={18} style={{ color: 'var(--portal-muted)' }} />
                </button>
              </div>

              {/* Product info */}
              <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--portal-elevated)' }}>
                <div className="flex items-center gap-2">
                  <Package size={16} style={{ color: 'var(--portal-accent)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--portal-text)' }}>{adjustItem.productName}</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>
                      {adjustItem.sku} · {[adjustItem.color, adjustItem.size].filter(Boolean).join(' / ')}
                    </p>
                  </div>
                </div>
                {adjustItem.warehouseName && (
                  <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: '1px solid var(--portal-border)' }}>
                    <Warehouse size={12} style={{ color: 'var(--portal-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--portal-text)' }}>{adjustItem.warehouseName}</span>
                    {adjustItem.warehousePincode && (
                      <span className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>({adjustItem.warehousePincode})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Current', value: adjustItem.quantity, color: 'var(--portal-text)' },
                  { label: 'Reserved', value: adjustItem.reserved, color: 'var(--portal-muted)' },
                  { label: 'Available', value: adjustItem.available, color: adjustItem.available <= 0 ? '#e03131' : '#4ade80' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2.5 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
                    <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--portal-muted)' }}>{s.label}</p>
                    <p className="text-lg font-bold font-mono mt-0.5" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--portal-muted)' }}>New Quantity</label>
                  <input
                    type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)}
                    className="portal-input font-mono text-lg font-bold"
                  />
                  {newQty && (
                    <p className="text-xs font-semibold mt-1" style={{
                      color: parseInt(newQty) > adjustItem.quantity ? '#4ade80' : parseInt(newQty) < adjustItem.quantity ? '#e03131' : 'var(--portal-muted)'
                    }}>
                      Delta: {parseInt(newQty) - adjustItem.quantity >= 0 ? '+' : ''}{parseInt(newQty) - adjustItem.quantity}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--portal-muted)' }}>Reason *</label>
                  <select value={reason} onChange={e => setReason(e.target.value)} className="portal-input">
                    <option value="">Select reason...</option>
                    <option value="Manual count correction">Manual count correction</option>
                    <option value="Damaged/defective stock">Damaged/defective stock</option>
                    <option value="Restock from supplier">Restock from supplier</option>
                    <option value="Returned item">Returned item</option>
                    <option value="Inventory audit">Inventory audit</option>
                    <option value="Promotional allocation">Promotional allocation</option>
                  </select>
                </div>
                <button
                  onClick={handleAdjust}
                  disabled={adjusting || !newQty || !reason}
                  className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-[0.98]"
                  style={{ background: 'var(--portal-accent)', color: '#fff' }}
                >
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
