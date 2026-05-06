'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Plus, Trash2, Check, Star } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

interface Address {
  id: string; label?: string; fullName: string; phone: string;
  line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean;
}

export default function AddressesPage() {
  const { data: addresses, mutate, isLoading } = useSWR<Address[]>('/api/storefront/addresses', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [settingDefault, setSettingDefault] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', label: 'Home',
  })

  const handleSave = async () => {
    if (!form.fullName || !form.phone || !form.addressLine1 || !form.city || !form.state || !form.pincode) {
      toast.error('Please fill all required fields'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/storefront/addresses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ ...form, isDefault: !addresses?.length }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setShowForm(false)
      setForm({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', label: 'Home' })
      mutate()
      toast.success('Address saved')
    } catch { toast.error('Failed to save address') }
    finally { setSaving(false) }
  }

  const handleSetDefault = async (id: string) => {
    setSettingDefault(id)
    try {
      const res = await fetch(`/api/storefront/addresses/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ isDefault: true }),
      })
      if (!res.ok) throw new Error('Failed to set default')
      mutate()
      toast.success('Default address updated')
    } catch { toast.error('Failed to set default address') }
    finally { setSettingDefault(null) }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await fetch(`/api/storefront/addresses/${id}`, { method: 'DELETE', credentials: 'include' })
      mutate()
      toast.success('Address deleted')
    } catch { toast.error('Failed to delete') }
    finally { setDeleting(null) }
  }

  return (
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between">
        <motion.h2 variants={fadeUpVariants} className="font-display text-xl font-bold text-clay-text">
          My Addresses
        </motion.h2>
        <ClayButton variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Add New
        </ClayButton>
      </div>

      {/* Add Address Form */}
      {showForm && (
        <motion.div variants={fadeUpVariants} className="clay-card p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name *" className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-clay-text-muted pointer-events-none select-none">🇮🇳 +91</span>
              <input value={form.phone} onChange={e => { let v = e.target.value.replace(/[^\d]/g, ''); if (v.startsWith('91') && v.length > 10) v = v.slice(2); if (v.length <= 10) setForm({ ...form, phone: v }) }} placeholder="98765 43210" maxLength={10} className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm pl-[4.5rem] pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose" />
            </div>
          </div>
          <input value={form.addressLine1} onChange={e => setForm({ ...form, addressLine1: e.target.value })} placeholder="Address Line 1 *" className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose" />
          <input value={form.addressLine2} onChange={e => setForm({ ...form, addressLine2: e.target.value })} placeholder="Landmark (optional)" className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose" />
          <div className="grid grid-cols-3 gap-3">
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City *" className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose" />
            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State *" className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose" />
            <input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="PIN Code *" className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose" />
          </div>
          <select value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose">
            <option value="Home">Home</option>
            <option value="Work">Work</option>
            <option value="Other">Other</option>
          </select>
          <div className="flex gap-2">
            <ClayButton variant="primary" size="sm" onClick={handleSave} loading={saving}>Save</ClayButton>
            <ClayButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</ClayButton>
          </div>
        </motion.div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 animate-shimmer rounded-clay-md" />)}
        </div>
      )}

      {!isLoading && (!addresses || addresses.length === 0) && !showForm && (
        <motion.div variants={fadeUpVariants} className="clay-card p-8 text-center">
          <MapPin size={32} className="mx-auto text-clay-text-muted mb-2" />
          <p className="text-sm text-clay-text-muted">No saved addresses yet</p>
        </motion.div>
      )}

      {addresses?.map((addr) => (
        <motion.div key={addr.id} variants={fadeUpVariants} className="clay-card p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-clay-rose mt-0.5 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-clay-text">{addr.label || 'Address'}</h3>
                  {addr.isDefault && (
                    <span className="text-[10px] bg-clay-sage/20 text-clay-sage px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Check size={10} /> Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-clay-text mt-1">{addr.fullName}</p>
                <p className="text-sm text-clay-text-secondary">{addr.line1}</p>
                {addr.line2 && <p className="text-sm text-clay-text-secondary">{addr.line2}</p>}
                <p className="text-sm text-clay-text-secondary">
                  {addr.city}, {addr.state} - {addr.postalCode}
                </p>
                <p className="text-sm text-clay-text-muted mt-1">+91 {addr.phone}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {!addr.isDefault && (
                <button
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-clay-rose/10 text-clay-rose hover:bg-clay-rose/20 transition-colors disabled:opacity-50"
                  onClick={() => handleSetDefault(addr.id)}
                  disabled={settingDefault === addr.id}
                >
                  <Star size={11} fill={settingDefault === addr.id ? 'currentColor' : 'none'} />
                  {settingDefault === addr.id ? 'Setting...' : 'Set Default'}
                </button>
              )}
              <button
                className="p-2 text-clay-text-muted hover:text-clay-error transition-colors"
                onClick={() => handleDelete(addr.id)}
                disabled={deleting === addr.id}
              >
                <Trash2 size={14} className={deleting === addr.id ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
