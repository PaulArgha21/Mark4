'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Search, Plus, X, Tag, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { CredentialGate } from '@/components/portal/shared/CredentialGate'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, scaleInVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

interface CouponItem {
  id: string; code: string; description: string | null; discountType: string; discountValue: number
  minOrderValue: number | null; maxDiscount: number | null; scope: string
  maxRedemptions: number | null; usedCount: number; usageRate: number | null
  isFirstPurchase: boolean; isActive: boolean; isExpired: boolean
  startsAt: string | null; endsAt: string | null; createdAt: string
}

export default function CouponsPage() {
  const [items, setItems] = useState<CouponItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [needsElevation, setNeedsElevation] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: '', minOrderValue: '', maxDiscount: '', maxRedemptions: '',
    scope: 'ALL', startsAt: '', endsAt: '',
  })

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '15', status })
    if (search) params.set('search', search)
    fetch(`/api/portal/offers/coupons?${params}`)
      .then(r => r.json())
      .then(d => { if (d.data) { setItems(d.data.items ?? []); setTotalPages(d.data.pagination?.totalPages ?? 1) } })
      .catch(() => {}).finally(() => setLoading(false))
  }, [page, status, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!form.code || !form.discountValue) { toast.error('Code and discount required'); return }
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        code: form.code, discountType: form.discountType, discountValue: parseFloat(form.discountValue), scope: form.scope,
      }
      if (form.description) body.description = form.description
      if (form.minOrderValue) body.minOrderValue = parseFloat(form.minOrderValue)
      if (form.maxDiscount) body.maxDiscount = parseFloat(form.maxDiscount)
      if (form.maxRedemptions) body.maxRedemptions = parseInt(form.maxRedemptions)
      if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString()
      if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString()

      const res = await fetch('/api/portal/offers/coupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Coupon created')
        setShowCreate(false)
        setForm({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', minOrderValue: '', maxDiscount: '', maxRedemptions: '', scope: 'ALL', startsAt: '', endsAt: '' })
        fetchData()
      } else if (res.status === 403) {
        setNeedsElevation(true)
      } else {
        const d = await res.json()
        toast.error(d.error?.message ?? 'Failed')
      }
    } catch { toast.error('Network error') }
    finally { setCreating(false) }
  }

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    const res = await fetch(`/api/portal/offers/coupons/${id}`, {
      method: currentlyActive ? 'DELETE' : 'PUT',
      ...(!currentlyActive ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }) } : {}),
    })
    if (res.ok) { toast.success(currentlyActive ? 'Coupon deactivated' : 'Coupon activated'); fetchData() }
    else toast.error('Action failed')
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/offers" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Coupons</h1>
              <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Create and manage discount codes</p>
            </div>
          </div>
          <motion.button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--portal-accent)', color: '#fff' }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}>
            <Plus size={14} /> New Coupon
          </motion.button>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search code or description..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-transparent outline-none"
              style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'inactive', 'expired'].map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1) }}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize"
                style={{ background: status === s ? 'var(--portal-accent)' : 'transparent', color: status === s ? '#fff' : 'var(--portal-muted)', border: `1px solid ${status === s ? 'var(--portal-accent)' : 'var(--portal-border)'}` }}>
                {s}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['Code', 'Discount', 'Scope', 'Usage', 'Status', 'Valid Until', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="h-3 w-16 rounded bg-white/10 animate-pulse" /></td>))}
                  </tr>
                )) : items.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No coupons found</td></tr>
                ) : items.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--portal-border)' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono" style={{ background: 'var(--portal-accent)', color: '#fff' }}>{c.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatPrice(c.discountValue)}
                      {c.maxDiscount && <span className="text-[10px] ml-1" style={{ color: 'var(--portal-muted)' }}>(max {formatPrice(c.maxDiscount)})</span>}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>{c.scope}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: 'var(--portal-text)' }}>{c.usedCount}{c.maxRedemptions ? `/${c.maxRedemptions}` : ''}</span>
                      {c.usageRate !== null && (
                        <div className="h-1 rounded-full mt-1 w-16 overflow-hidden" style={{ background: 'var(--portal-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(c.usageRate, 100)}%`, background: c.usageRate >= 80 ? '#e03131' : 'var(--portal-accent)' }} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/10 text-gray-400"><Clock size={10} /> Expired</span>
                      ) : c.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400"><CheckCircle2 size={10} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400"><XCircle size={10} /> Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>{c.endsAt ? new Date(c.endsAt).toLocaleDateString() : 'No expiry'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(c.id, c.isActive)}
                        className="text-[10px] font-medium px-2 py-1 rounded-lg transition-colors"
                        style={{ color: c.isActive ? '#e03131' : '#2f9e44', background: c.isActive ? '#e0313110' : '#2f9e4410' }}>
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
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

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && !needsElevation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div variants={scaleInVariants} initial="hidden" animate="visible" exit="hidden"
              className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Create Coupon</h3>
                <button onClick={() => setShowCreate(false)}><X size={18} style={{ color: 'var(--portal-muted)' }} /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Code *</label>
                    <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SUMMER20" className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none font-mono"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Type</label>
                    <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Description</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                    style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Discount Value *</label>
                    <input type="number" value={form.discountValue} onChange={e => setForm(p => ({ ...p, discountValue: e.target.value }))}
                      placeholder={form.discountType === 'PERCENTAGE' ? '20' : '500'}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Min Order</label>
                    <input type="number" value={form.minOrderValue} onChange={e => setForm(p => ({ ...p, minOrderValue: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Max Discount</label>
                    <input type="number" value={form.maxDiscount} onChange={e => setForm(p => ({ ...p, maxDiscount: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Max Redemptions</label>
                    <input type="number" value={form.maxRedemptions} onChange={e => setForm(p => ({ ...p, maxRedemptions: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Scope</label>
                    <select value={form.scope} onChange={e => setForm(p => ({ ...p, scope: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
                      <option value="ALL">All Products</option>
                      <option value="SPECIFIC_PRODUCTS">Specific Products</option>
                      <option value="SPECIFIC_CATEGORIES">Specific Categories</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Starts At</label>
                    <input type="datetime-local" value={form.startsAt} onChange={e => setForm(p => ({ ...p, startsAt: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)', colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Ends At</label>
                    <input type="datetime-local" value={form.endsAt} onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)', colorScheme: 'dark' }} />
                  </div>
                </div>
                {form.discountType === 'PERCENTAGE' && parseFloat(form.discountValue) >= 40 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#f08c0015', border: '1px solid #f08c0030' }}>
                    <Tag size={14} style={{ color: '#f08c00' }} />
                    <span className="text-xs" style={{ color: '#f08c00' }}>Discounts ≥40% require credential elevation</span>
                  </div>
                )}
                <button onClick={handleCreate} disabled={creating}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 mt-2"
                  style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                  {creating ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {needsElevation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <CredentialGate action="create high-discount coupon" onSuccess={() => { setNeedsElevation(false); handleCreate() }} onCancel={() => setNeedsElevation(false)} />
          </div>
        </div>
      )}
    </PortalShell>
  )
}
