'use client'
import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, MessageSquare, Trash2, Star } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
const API = '/api/portal/cms/reviews'

interface Review {
  id: string; rating: number; title?: string | null; comment?: string | null; images: string[]
  isApproved: boolean; isVerified: boolean; adminReply?: string | null; createdAt: string
  product: { id: string; name: string; slug: string; media: { url: string }[] }
  user: { id: string; name?: string | null; email?: string | null }
}

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState('pending')
  const url = `${API}?status=${statusFilter}`
  const { data, isLoading } = useSWR(url, fetcher)
  const [replyId, setReplyId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const reviews: Review[] = data?.items ?? []
  const pendingCount: number = data?.pendingCount ?? 0

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await fetch(`${API}/${id}`, { method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
    mutate(url); toast.success(action === 'approve' ? 'Review approved' : 'Review rejected')
  }

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return
    await fetch(`${API}/${id}`, { method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reply', adminReply: replyText }) })
    setReplyId(null); setReplyText('')
    mutate(url); toast.success('Reply posted')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', credentials: 'include' })
    mutate(url); toast.success('Review deleted')
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Review Moderation</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>
              {pendingCount > 0 ? `${pendingCount} reviews pending approval` : 'All reviews moderated'}
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUpVariants} className="flex gap-2">
          {['pending', 'approved', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors"
              style={{
                background: statusFilter === s ? 'var(--portal-accent)' : 'var(--portal-surface)',
                color: statusFilter === s ? '#fff' : 'var(--portal-muted)',
                border: '1px solid var(--portal-border)',
              }}>
              {s} {s === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
          ))}
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
          ))}</div>
        ) : reviews.length === 0 ? (
          <motion.div variants={fadeUpVariants} className="text-center py-16 rounded-xl" style={{ background: 'var(--portal-surface)' }}>
            <Star size={40} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)' }} />
            <p style={{ color: 'var(--portal-muted)' }}>No reviews in this category.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <motion.div key={review.id} variants={fadeUpVariants} className="rounded-xl p-4"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="flex items-start gap-4">
                  {review.product.media?.[0]?.url && (
                    <img src={review.product.media[0].url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} fill={i < review.rating ? '#f59e0b' : 'none'} stroke={i < review.rating ? '#f59e0b' : 'var(--portal-muted)'} />
                      ))}</div>
                      <span className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>{review.product.name}</span>
                      {review.isVerified && <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Verified</span>}
                    </div>
                    {review.title && <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{review.title}</p>}
                    {review.comment && <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>{review.comment}</p>}
                    {review.images.length > 0 && (
                      <div className="flex gap-2 mt-2">{review.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-10 h-10 rounded object-cover" />
                      ))}</div>
                    )}
                    <p className="text-xs mt-2" style={{ color: 'var(--portal-muted)' }}>
                      by {review.user.name ?? review.user.email ?? 'Anonymous'} · {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                    {review.adminReply && (
                      <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)' }}>
                        <span className="font-medium">Admin reply:</span> {review.adminReply}
                      </div>
                    )}
                    {replyId === review.id && (
                      <div className="mt-2 flex gap-2">
                        <input className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
                          style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}
                          placeholder="Write a reply..." value={replyText}
                          onChange={e => setReplyText(e.target.value)} />
                        <ClayButton variant="primary" size="sm" onClick={() => handleReply(review.id)}>Send</ClayButton>
                        <ClayButton variant="ghost" size="sm" onClick={() => setReplyId(null)}>Cancel</ClayButton>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!review.isApproved && (
                      <button onClick={() => handleAction(review.id, 'approve')} className="p-1.5 rounded-lg hover:bg-white/5" title="Approve"
                        style={{ color: '#22c55e' }}><CheckCircle2 size={16} /></button>
                    )}
                    {review.isApproved && (
                      <button onClick={() => handleAction(review.id, 'reject')} className="p-1.5 rounded-lg hover:bg-white/5" title="Reject"
                        style={{ color: '#f59e0b' }}><XCircle size={16} /></button>
                    )}
                    <button onClick={() => { setReplyId(review.id); setReplyText(review.adminReply ?? '') }}
                      className="p-1.5 rounded-lg hover:bg-white/5" title="Reply"
                      style={{ color: 'var(--portal-accent)' }}><MessageSquare size={16} /></button>
                    <button onClick={() => handleDelete(review.id)} className="p-1.5 rounded-lg hover:bg-white/5" title="Delete"
                      style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </PortalShell>
  )
}
