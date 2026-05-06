'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { motion } from 'framer-motion'
import { Plus, Trash2, Pencil, Image as ImageIcon } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
const API = '/api/portal/cms/gallery'

interface GalleryItem {
  id: string; imageUrl: string; videoUrl?: string | null; caption?: string | null
  linkUrl?: string | null; sizeClass: string; isActive: boolean; sortOrder: number
}

export default function GalleryPage() {
  const { data, isLoading } = useSWR(API, fetcher)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<GalleryItem | null>(null)

  const items: GalleryItem[] = data ?? []

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' })
    mutate(API); toast.success('Item deleted')
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Style Gallery</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Manage the gallery collage section on the homepage</p>
          </div>
          <ClayButton variant="primary" size="sm" onClick={() => { setEditItem(null); setShowModal(true) }}>
            <Plus size={16} /> Add Item
          </ClayButton>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div variants={fadeUpVariants} className="text-center py-16 rounded-xl" style={{ background: 'var(--portal-surface)' }}>
            <ImageIcon size={40} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)' }} />
            <p style={{ color: 'var(--portal-muted)' }}>No gallery items yet.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map(item => (
              <motion.div key={item.id} variants={fadeUpVariants}
                className="rounded-xl overflow-hidden relative group"
                style={{ border: '1px solid var(--portal-border)', opacity: item.isActive ? 1 : 0.4 }}>
                <img src={item.imageUrl} alt={item.caption ?? ''} className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button onClick={() => { setEditItem(item); setShowModal(true) }}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm"><Pencil size={14} className="text-white" /></button>
                  <button onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm"><Trash2 size={14} className="text-red-400" /></button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-xs text-white truncate">{item.caption || item.sizeClass}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={springs.gentle}
              className="w-full max-w-md rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--portal-bg)', border: '1px solid var(--portal-border)' }}>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
                {editItem ? 'Edit Gallery Item' : 'New Gallery Item'}
              </h2>
              <GalleryForm item={editItem} onDone={() => { setShowModal(false); mutate(API) }} />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}

function GalleryForm({ item, onDone }: { item: GalleryItem | null; onDone: () => void }) {
  const [form, setForm] = useState({
    imageUrl: item?.imageUrl ?? '', caption: item?.caption ?? '', linkUrl: item?.linkUrl ?? '',
    sizeClass: item?.sizeClass ?? 'medium', sortOrder: item?.sortOrder ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.imageUrl) { toast.error('Image URL is required'); return }
    setSaving(true)
    try {
      if (item) {
        await fetch(`${API}/${item.id}`, { method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      } else {
        await fetch(API, { method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      }
      toast.success(item ? 'Updated' : 'Created')
      onDone()
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {[
        { label: 'Image URL', key: 'imageUrl', ph: 'https://...' },
        { label: 'Caption', key: 'caption', ph: 'Summer vibes' },
        { label: 'Link URL', key: 'linkUrl', ph: '/collections/summer' },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>{f.label}</label>
          <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
            placeholder={f.ph} value={(form as Record<string, string | number>)[f.key] as string}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
        </div>
      ))}
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Size Class</label>
        <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
          value={form.sizeClass} onChange={e => setForm(prev => ({ ...prev, sizeClass: e.target.value }))}>
          {['small', 'medium', 'large', 'tall', 'wide'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <ClayButton variant="ghost" size="sm" onClick={onDone}>Cancel</ClayButton>
        <ClayButton variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
          {item ? 'Save' : 'Create'}
        </ClayButton>
      </div>
    </div>
  )
}
