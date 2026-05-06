'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Plus, Factory, X, Mail, Phone, MapPin } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, scaleInVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

interface Supplier { id: string; name: string; email: string | null; phone: string | null; address: string | null; gstNumber: string | null; isActive: boolean; poCount: number; createdAt: string }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', gstNumber: '' })
  const [creating, setCreating] = useState(false)

  const fetchData = () => {
    setLoading(true)
    fetch('/api/portal/inventory/suppliers').then(r => r.json())
      .then(d => { if (d.data) setSuppliers(d.data.items ?? []) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetchData() }, [])

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/portal/inventory/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, gstNumber: form.gstNumber || undefined }),
      })
      if (res.ok) { toast.success('Supplier created'); setShowCreate(false); setForm({ name: '', email: '', phone: '', address: '', gstNumber: '' }); fetchData() }
      else { const d = await res.json(); toast.error(d.error?.message ?? 'Failed') }
    } catch { toast.error('Network error') }
    finally { setCreating(false) }
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/inventory" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Suppliers</h1>
              <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Manage supplier relationships</p>
            </div>
          </div>
          <motion.button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--portal-accent)', color: '#fff' }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}>
            <Plus size={14} /> Add Supplier
          </motion.button>
        </motion.div>

        {/* Supplier cards */}
        <motion.div variants={fadeUpVariants} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="h-4 w-32 rounded bg-white/10 mb-3" /><div className="h-3 w-24 rounded bg-white/10" />
            </div>
          )) : suppliers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No suppliers yet</div>
          ) : suppliers.map(s => (
            <motion.div key={s.id} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
              whileHover={{ y: -2, borderColor: 'var(--portal-accent)' }} transition={springs.gentle}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.isActive ? '#7950f215' : '#e0313115' }}>
                  <Factory size={18} style={{ color: s.isActive ? '#7950f2' : '#e03131' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--portal-text)' }}>{s.name}</h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {s.email && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--portal-muted)' }}><Mail size={11} />{s.email}</div>}
                {s.phone && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--portal-muted)' }}><Phone size={11} />{s.phone}</div>}
                {s.address && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--portal-muted)' }}><MapPin size={11} /><span className="truncate">{s.address}</span></div>}
                {s.gstNumber && <div className="text-xs font-mono" style={{ color: 'var(--portal-muted)' }}>GST: {s.gstNumber}</div>}
              </div>
              <div className="mt-3 pt-3 flex justify-between text-xs" style={{ borderTop: '1px solid var(--portal-border)' }}>
                <span style={{ color: 'var(--portal-muted)' }}>{s.poCount} purchase orders</span>
                <span style={{ color: 'var(--portal-muted)' }}>Since {new Date(s.createdAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div variants={scaleInVariants} initial="hidden" animate="visible" exit="hidden"
              className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Add Supplier</h3>
                <button onClick={() => setShowCreate(false)}><X size={18} style={{ color: 'var(--portal-muted)' }} /></button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'name', label: 'Company Name *', type: 'text' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'phone', label: 'Phone', type: 'tel' },
                  { key: 'address', label: 'Address', type: 'text' },
                  { key: 'gstNumber', label: 'GST Number', type: 'text' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>{f.label}</label>
                    <input type={f.type} value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                      style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                  </div>
                ))}
                <button onClick={handleCreate} disabled={creating || !form.name.trim()}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 mt-2"
                  style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                  {creating ? 'Creating...' : 'Create Supplier'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalShell>
  )
}
