'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
const API = '/api/portal/cms/stories'

interface Story { id: string; title?: string | null; imageUrl: string; linkUrl?: string | null; isActive: boolean; sortOrder: number }

export default function StoriesPage() {
  const { data, isLoading } = useSWR(API, fetcher)
  const [showModal, setShowModal] = useState(false)
  const [editStory, setEditStory] = useState<Story | null>(null)

  const stories: Story[] = data ?? []

  const handleToggle = async (s: Story) => {
    await fetch(`${API}/${s.id}`, { method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !s.isActive }) })
    mutate(API)
    toast.success(s.isActive ? 'Story hidden' : 'Story activated')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this story?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' })
    mutate(API)
    toast.success('Story deleted')
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Story Banners</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Manage Instagram-style story bubbles on the homepage</p>
          </div>
          <ClayButton variant="primary" size="sm" onClick={() => { setEditStory(null); setShowModal(true) }}>
            <Plus size={16} /> Add Story
          </ClayButton>
        </motion.div>

        {isLoading ? (
          <div className="flex gap-4">{Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-16 h-16 rounded-full animate-pulse" style={{ background: 'var(--portal-surface)' }} />
          ))}</div>
        ) : stories.length === 0 ? (
          <motion.div variants={fadeUpVariants} className="text-center py-16 rounded-xl" style={{ background: 'var(--portal-surface)' }}>
            <p className="text-4xl mb-3">📸</p>
            <p style={{ color: 'var(--portal-muted)' }}>No stories yet. Add your first story banner.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stories.map(story => (
              <motion.div key={story.id} variants={fadeUpVariants}
                className="rounded-xl p-3 text-center group relative"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', opacity: story.isActive ? 1 : 0.4 }}>
                <img src={story.imageUrl} alt={story.title ?? ''} className="w-16 h-16 rounded-full object-cover mx-auto mb-2 ring-2 ring-offset-2"
                  style={{ ringColor: 'var(--portal-accent)', ringOffsetColor: 'var(--portal-surface)' } as React.CSSProperties} />
                <p className="text-xs font-medium truncate" style={{ color: 'var(--portal-text)' }}>{story.title || 'Untitled'}</p>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleToggle(story)} className="p-1 rounded"
                    style={{ color: story.isActive ? 'var(--portal-accent)' : 'var(--portal-muted)' }}>
                    {story.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button onClick={() => { setEditStory(story); setShowModal(true) }} className="p-1 rounded" style={{ color: 'var(--portal-muted)' }}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(story.id)} className="p-1 rounded" style={{ color: '#ef4444' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={springs.gentle}
              className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--portal-bg)', border: '1px solid var(--portal-border)' }}>
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
                {editStory ? 'Edit Story' : 'New Story'}
              </h2>
              <StoryForm story={editStory} onDone={() => { setShowModal(false); mutate(API) }} />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}

function StoryForm({ story, onDone }: { story: Story | null; onDone: () => void }) {
  const [form, setForm] = useState({ title: story?.title ?? '', imageUrl: story?.imageUrl ?? '', linkUrl: story?.linkUrl ?? '', sortOrder: story?.sortOrder ?? 0 })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (story) {
        await fetch(`${API}/${story.id}`, { method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      } else {
        await fetch(API, { method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      }
      toast.success(story ? 'Story updated' : 'Story created')
      onDone()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {[
        { label: 'Title', key: 'title', placeholder: 'New Arrivals' },
        { label: 'Image URL', key: 'imageUrl', placeholder: 'https://...' },
        { label: 'Link URL', key: 'linkUrl', placeholder: '/category/new-arrivals' },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>{f.label}</label>
          <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
            placeholder={f.placeholder}
            value={(form as Record<string, string | number>)[f.key] as string}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-2">
        <ClayButton variant="ghost" size="sm" onClick={onDone}>Cancel</ClayButton>
        <ClayButton variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
          {story ? 'Save' : 'Create'}
        </ClayButton>
      </div>
    </div>
  )
}
