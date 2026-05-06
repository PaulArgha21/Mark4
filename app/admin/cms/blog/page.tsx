'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Clock, CheckCircle2, FileText, Send } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
const API = '/api/portal/cms/blog'

interface BlogPost {
  id: string; title: string; slug: string; excerpt?: string | null; status: string
  coverImage?: string | null; authorName?: string | null; publishedAt?: string | null
  readTimeMinutes?: number | null; tags: { id: string; name: string }[]
  createdAt: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'var(--portal-muted)' },
  PUBLISHED: { label: 'Published', color: '#22c55e' },
  SCHEDULED: { label: 'Scheduled', color: '#3b82f6' },
  ARCHIVED: { label: 'Archived', color: '#6b7280' },
}

export default function BlogPage() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const url = statusFilter ? `${API}?status=${statusFilter}` : API
  const { data, isLoading } = useSWR(url, fetcher)
  const [showEditor, setShowEditor] = useState(false)
  const [editPost, setEditPost] = useState<BlogPost | null>(null)

  const posts: BlogPost[] = data?.items ?? []

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' })
    mutate(url); toast.success('Post deleted')
  }

  const handlePublish = async (post: BlogPost) => {
    await fetch(`${API}/${post.id}`, { method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PUBLISHED', publishedAt: new Date().toISOString() }) })
    mutate(url); toast.success('Post published!')
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Blog & Editorial</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Create and manage blog posts and style guides</p>
          </div>
          <ClayButton variant="primary" size="sm" onClick={() => { setEditPost(null); setShowEditor(true) }}>
            <Plus size={16} /> New Post
          </ClayButton>
        </motion.div>

        {/* Status filters */}
        <motion.div variants={fadeUpVariants} className="flex gap-2">
          {[null, 'DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'].map(s => (
            <button key={s ?? 'all'} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                background: statusFilter === s ? 'var(--portal-accent)' : 'var(--portal-surface)',
                color: statusFilter === s ? '#fff' : 'var(--portal-muted)',
                border: '1px solid var(--portal-border)',
              }}>
              {s ? STATUS_MAP[s].label : 'All'}
            </button>
          ))}
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
          ))}</div>
        ) : posts.length === 0 ? (
          <motion.div variants={fadeUpVariants} className="text-center py-16 rounded-xl" style={{ background: 'var(--portal-surface)' }}>
            <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)' }} />
            <p style={{ color: 'var(--portal-muted)' }}>No blog posts yet.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <motion.div key={post.id} variants={fadeUpVariants}
                className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="w-20 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--portal-elevated)' }}>
                    <FileText size={18} style={{ color: 'var(--portal-muted)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate" style={{ color: 'var(--portal-text)' }}>{post.title}</h3>
                    <ClayBadge variant="default" size="sm">{STATUS_MAP[post.status]?.label ?? post.status}</ClayBadge>
                  </div>
                  <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--portal-muted)' }}>{post.excerpt || 'No excerpt'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--portal-muted)' }}>
                    {post.authorName && <span>{post.authorName}</span>}
                    {post.readTimeMinutes && <span>{post.readTimeMinutes} min read</span>}
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    {post.tags.length > 0 && <span>{post.tags.map(t => t.name).join(', ')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {post.status === 'DRAFT' && (
                    <button onClick={() => handlePublish(post)} className="p-2 rounded-lg hover:bg-white/5" title="Publish"
                      style={{ color: '#22c55e' }}><Send size={14} /></button>
                  )}
                  <button onClick={() => { setEditPost(post); setShowEditor(true) }} className="p-2 rounded-lg hover:bg-white/5"
                    style={{ color: 'var(--portal-muted)' }}><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-white/5"
                    style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {data?.pagination && data.pagination.totalPages > 1 && (
          <motion.div variants={fadeUpVariants} className="text-center text-xs" style={{ color: 'var(--portal-muted)' }}>
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} posts total
          </motion.div>
        )}

        {showEditor && <BlogEditor post={editPost} onClose={() => { setShowEditor(false); mutate(url) }} />}
      </motion.div>
    </PortalShell>
  )
}

function BlogEditor({ post, onClose }: { post: BlogPost | null; onClose: () => void }) {
  const [form, setForm] = useState({
    title: post?.title ?? '', slug: post?.slug ?? '', excerpt: post?.excerpt ?? '',
    content: '', coverImage: post?.coverImage ?? '', authorName: post?.authorName ?? '',
    status: post?.status ?? 'DRAFT', tagNames: post?.tags?.map(t => t.name).join(', ') ?? '',
    readTimeMinutes: post?.readTimeMinutes ?? 5,
  })
  const [saving, setSaving] = useState(false)
  const [contentLoaded, setContentLoaded] = useState(!post)

  // Load full content if editing
  if (post && !contentLoaded) {
    fetch(`${API}/${post.id}`, { credentials: 'include' })
      .then(r => r.json()).then(r => {
        setForm(prev => ({ ...prev, content: r.data?.content ?? '' }))
        setContentLoaded(true)
      })
  }

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSubmit = async () => {
    if (!form.title || !form.slug || !form.content) { toast.error('Title, slug, and content are required'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        tagNames: form.tagNames ? form.tagNames.split(',').map(t => t.trim()).filter(Boolean) : [],
      }
      if (post) {
        await fetch(`${API}/${post.id}`, { method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        await fetch(API, { method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      toast.success(post ? 'Post updated' : 'Post created')
      onClose()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={springs.gentle}
        className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--portal-bg)', border: '1px solid var(--portal-border)' }}>
        <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
          {post ? 'Edit Post' : 'New Blog Post'}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Title</label>
            <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value, slug: post ? prev.slug : autoSlug(e.target.value) }))} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Slug</label>
            <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Status</label>
            <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}>
              {['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Excerpt</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" rows={2}
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              value={form.excerpt} onChange={e => setForm(prev => ({ ...prev, excerpt: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Content (Markdown/HTML)</label>
            <textarea className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none font-mono" rows={10}
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              value={form.content} onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Cover Image URL</label>
            <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              value={form.coverImage} onChange={e => setForm(prev => ({ ...prev, coverImage: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--portal-muted)' }}>Tags (comma-separated)</label>
            <input className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
              placeholder="fashion, summer, trends" value={form.tagNames}
              onChange={e => setForm(prev => ({ ...prev, tagNames: e.target.value }))} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <ClayButton variant="ghost" size="sm" onClick={onClose}>Cancel</ClayButton>
          <ClayButton variant="primary" size="sm" onClick={handleSubmit} loading={saving}>
            {post ? 'Save Changes' : 'Create Post'}
          </ClayButton>
        </div>
      </motion.div>
    </motion.div>
  )
}
