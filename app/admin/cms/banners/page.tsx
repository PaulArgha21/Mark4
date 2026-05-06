'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Eye, EyeOff, Image as ImageIcon } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
const API = '/api/portal/cms/banners'

interface Banner {
  id: string
  title?: string | null
  subtitle?: string | null
  name?: string
  imageUrl?: string | null
  linkUrl?: string | null
  isActive: boolean
  sortOrder: number
  startsAt?: string | null
  endsAt?: string | null
}

export default function BannersPage() {
  const { data, isLoading } = useSWR(`${API}?type=hero`, fetcher)
  const [showCreate, setShowCreate] = useState(false)
  const [editBanner, setEditBanner] = useState<Banner | null>(null)

  const banners: Banner[] = data ?? []

  const handleToggle = async (banner: Banner) => {
    try {
      await fetch(`${API}/${banner.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive }),
      })
      mutate(`${API}?type=hero`)
      toast.success(banner.isActive ? 'Banner hidden' : 'Banner activated')
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      mutate(`${API}?type=hero`)
      toast.success('Banner deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Hero Banners</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Manage hero carousel banners on the homepage</p>
          </div>
          <ClayButton variant="primary" size="sm" onClick={() => { setEditBanner(null); setShowCreate(true) }}>
            <Plus size={16} /> Add Banner
          </ClayButton>
        </motion.div>

        {isLoading ? (
          <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
          ))}</div>
        ) : banners.length === 0 ? (
          <motion.div variants={fadeUpVariants} className="text-center py-16 rounded-xl" style={{ background: 'var(--portal-surface)' }}>
            <ImageIcon size={40} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)' }} />
            <p style={{ color: 'var(--portal-muted)' }}>No banners yet. Create your first hero banner.</p>
          </motion.div>
        ) : (
          <div className="grid gap-3">
            {banners.map((banner) => (
              <motion.div key={banner.id} variants={fadeUpVariants}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', opacity: banner.isActive ? 1 : 0.5 }}>
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title ?? ''} className="w-24 h-14 object-cover rounded-lg" />
                ) : (
                  <div className="w-24 h-14 rounded-lg flex items-center justify-center" style={{ background: 'var(--portal-elevated)' }}>
                    <ImageIcon size={20} style={{ color: 'var(--portal-muted)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--portal-text)' }}>{banner.title || 'Untitled'}</p>
                  <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{banner.subtitle || 'No subtitle'}</p>
                  {banner.linkUrl && <p className="text-xs truncate" style={{ color: 'var(--portal-accent)' }}>{banner.linkUrl}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggle(banner)} className="p-2 rounded-lg hover:bg-white/5"
                    style={{ color: banner.isActive ? 'var(--portal-accent)' : 'var(--portal-muted)' }}>
                    {banner.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button onClick={() => { setEditBanner(banner); setShowCreate(true) }} className="p-2 rounded-lg hover:bg-white/5"
                    style={{ color: 'var(--portal-muted)' }}><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(banner.id)} className="p-2 rounded-lg hover:bg-white/5"
                    style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showCreate && <BannerModal banner={editBanner} onClose={() => setShowCreate(false)} />}
      </motion.div>
    </PortalShell>
  )
}

function BannerModal({ banner, onClose }: { banner: Banner | null; onClose: () => void }) {
  const [form, setForm] = useState({
    title: banner?.title ?? '',
    subtitle: banner?.subtitle ?? '',
    imageUrl: banner?.imageUrl ?? '',
    linkUrl: banner?.linkUrl ?? '',
    isActive: banner?.isActive ?? true,
    sortOrder: banner?.sortOrder ?? 0,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (banner) {
        await fetch(`${API}/${banner.id}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch(API, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, bannerType: 'hero' }),
        })
      }
      mutate(`${API}?type=hero`)
      toast.success(banner ? 'Banner updated' : 'Banner created')
      onClose()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={springs.gentle}
        className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: 'var(--portal-bg)', border: '1px solid var(--portal-border)' }}>
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
          {banner ? 'Edit Banner' : 'New Hero Banner'}
        </h2>
        {[
          { label: 'Title', key: 'title', placeholder: 'Summer Collection 2026' },
          { label: 'Subtitle', key: 'subtitle', placeholder: 'Up to 50% off' },
          { label: 'Image URL', key: 'imageUrl', placeholder: 'https://...' },
          { label: 'Link URL', key: 'linkUrl', placeholder: '/collections/summer' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>{f.label}</label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              placeholder={f.placeholder}
              value={(form as Record<string, string | number | boolean>)[f.key] as string}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>Sort Order</label>
          <input type="number" className="w-20 px-2 py-1 rounded-lg text-sm outline-none"
            style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
            value={form.sortOrder} onChange={e => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <ClayButton variant="ghost" size="sm" onClick={onClose}>Cancel</ClayButton>
          <ClayButton variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
            {banner ? 'Save Changes' : 'Create Banner'}
          </ClayButton>
        </div>
      </motion.div>
    </motion.div>
  )
}
