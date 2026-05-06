'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Eye, EyeOff, Package, ExternalLink } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
const API = '/api/portal/cms/collections'

interface Collection {
  id: string; name: string; slug: string; description?: string | null
  bannerUrl?: string | null; isActive: boolean; sortOrder: number; productCount: number
}

export default function CollectionsPage() {
  const { data, isLoading } = useSWR(API, fetcher)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Collection | null>(null)

  const collections: Collection[] = data ?? []

  const handleToggle = async (c: Collection) => {
    await fetch(`${API}/${c.id}`, { method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !c.isActive }) })
    mutate(API); toast.success(c.isActive ? 'Collection hidden' : 'Collection activated')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection and all product assignments?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' })
    mutate(API); toast.success('Collection deleted')
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Collections</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Create curated product collections for the storefront</p>
          </div>
          <ClayButton variant="primary" size="sm" onClick={() => { setEditItem(null); setShowModal(true) }}>
            <Plus size={16} /> New Collection
          </ClayButton>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <motion.div variants={fadeUpVariants} className="text-center py-16 rounded-xl" style={{ background: 'var(--portal-surface)' }}>
            <Package size={40} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)' }} />
            <p style={{ color: 'var(--portal-muted)' }}>No collections yet. Create your first one.</p>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map(c => (
              <motion.div key={c.id} variants={fadeUpVariants}
                className="rounded-xl overflow-hidden group"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', opacity: c.isActive ? 1 : 0.5 }}>
                {c.bannerUrl ? (
                  <img src={c.bannerUrl} alt={c.name} className="w-full h-32 object-cover" />
                ) : (
                  <div className="w-full h-32 flex items-center justify-center" style={{ background: 'var(--portal-elevated)' }}>
                    <Package size={32} style={{ color: 'var(--portal-muted)' }} />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: 'var(--portal-text)' }}>{c.name}</h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>/{c.slug} · {c.productCount} products</p>
                    </div>
                    <a href={`/collections/${c.slug}`} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--portal-accent)' }}>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  {c.description && (
                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--portal-muted)' }}>{c.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--portal-border)' }}>
                    <button onClick={() => handleToggle(c)} className="p-1.5 rounded-lg hover:bg-white/5"
                      style={{ color: c.isActive ? 'var(--portal-accent)' : 'var(--portal-muted)' }}>
                      {c.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => { setEditItem(c); setShowModal(true) }} className="p-1.5 rounded-lg hover:bg-white/5"
                      style={{ color: 'var(--portal-muted)' }}><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-white/5"
                      style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={springs.gentle}
              className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--portal-bg)', border: '1px solid var(--portal-border)' }}>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
                {editItem ? 'Edit Collection' : 'New Collection'}
              </h2>
              <CollectionForm collection={editItem} onDone={() => { setShowModal(false); mutate(API) }} />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}

function CollectionForm({ collection, onDone }: { collection: Collection | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: collection?.name ?? '', slug: collection?.slug ?? '',
    description: collection?.description ?? '', bannerUrl: collection?.bannerUrl ?? '',
    sortOrder: collection?.sortOrder ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSubmit = async () => {
    if (!form.name || !form.slug) { toast.error('Name and slug are required'); return }
    setSaving(true)
    try {
      if (collection) {
        await fetch(`${API}/${collection.id}`, { method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      } else {
        await fetch(API, { method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      }
      toast.success(collection ? 'Collection updated' : 'Collection created')
      onDone()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Name</label>
        <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
          placeholder="Summer Essentials" value={form.name}
          onChange={e => setForm(prev => ({ ...prev, name: e.target.value, slug: collection ? prev.slug : autoSlug(e.target.value) }))} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Slug</label>
        <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
          value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Description</label>
        <textarea className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" rows={3}
          style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
          placeholder="Curated picks for the season..." value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
      </div>
      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Banner Image URL</label>
        <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
          placeholder="https://..." value={form.bannerUrl}
          onChange={e => setForm(prev => ({ ...prev, bannerUrl: e.target.value }))} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <ClayButton variant="ghost" size="sm" onClick={onDone}>Cancel</ClayButton>
        <ClayButton variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
          {collection ? 'Save' : 'Create'}
        </ClayButton>
      </div>
    </div>
  )
}
