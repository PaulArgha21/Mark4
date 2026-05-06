'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { useAuth } from '@/hooks/useAuth'
import { ClayButton } from '@/components/ui/ClayButton'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Review } from '@/lib/types'

interface ReviewsSectionProps {
  productId: string
  initialReviews: Review[]
  ratingDistribution: { rating: number; count: number }[]
  averageRating: number
  reviewCount: number
}

export function ReviewsSection({
  productId,
  initialReviews,
  ratingDistribution,
  averageRating,
  reviewCount,
}: ReviewsSectionProps) {
  const maxCount = Math.max(...ratingDistribution.map(r => r.count), 1)
  const { isAuthenticated, user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [showForm, setShowForm] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [newTitle, setNewTitle] = useState('')
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitReview = async () => {
    if (!newComment.trim()) { toast.error('Please write a comment'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, rating: newRating, title: newTitle || undefined, comment: newComment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to submit')
      setReviews(prev => [data.data, ...prev])
      setShowForm(false)
      setNewTitle('')
      setNewComment('')
      setNewRating(5)
      toast.success('Review submitted!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit review'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      <motion.h2
        variants={fadeUpVariants}
        className="font-display text-2xl font-bold text-clay-text mb-6"
      >
        Customer Reviews
      </motion.h2>

      <div className="grid md:grid-cols-[280px_1fr] gap-8">
        {/* Rating Summary */}
        <motion.div variants={fadeUpVariants} className="clay-card p-5 space-y-4">
          <div className="text-center">
            <p className="font-display text-5xl font-bold text-clay-text">{averageRating.toFixed(1)}</p>
            <div className="flex justify-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  size={18}
                  className={s <= Math.round(averageRating) ? 'text-clay-butter fill-clay-butter' : 'text-clay-border'}
                />
              ))}
            </div>
            <p className="text-sm text-clay-text-muted mt-1">{reviewCount} reviews</p>
          </div>

          <div className="space-y-2">
            {ratingDistribution.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs w-3 text-clay-text-muted">{rating}</span>
                <Star size={12} className="text-clay-butter fill-clay-butter" />
                <div className="flex-1 h-2 bg-clay-bg-sunken rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-clay-butter rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(count / maxCount) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  />
                </div>
                <span className="text-xs w-7 text-right text-clay-text-muted">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Review List */}
        <div className="space-y-4">
          {/* Write Review */}
          <motion.div variants={fadeUpVariants} className="clay-card p-4">
            {!isAuthenticated ? (
              <div className="text-center py-3">
                <p className="text-sm text-clay-text-muted mb-2">Sign in to write a review</p>
                <Link href="/login" className="text-sm text-clay-rose font-semibold hover:underline">Sign In</Link>
              </div>
            ) : !showForm ? (
              <ClayButton variant="secondary" size="sm" onClick={() => setShowForm(true)} fullWidth>
                Write a Review
              </ClayButton>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setNewRating(s)}>
                      <Star size={20} className={s <= newRating ? 'text-clay-butter fill-clay-butter' : 'text-clay-border'} />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Review title (optional)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose"
                />
                <textarea
                  placeholder="Share your experience..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose resize-none"
                />
                <div className="flex gap-2">
                  <ClayButton variant="primary" size="sm" onClick={handleSubmitReview} loading={submitting}>
                    Submit
                  </ClayButton>
                  <ClayButton variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </ClayButton>
                </div>
              </div>
            )}
          </motion.div>

          {reviews.map((review) => (
            <motion.div
              key={review.id}
              variants={fadeUpVariants}
              className="clay-card p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-clay-blush flex items-center justify-center text-sm font-bold text-clay-rose">
                      {review.user.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-clay-text">{review.user.name}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={12}
                            className={s <= review.rating ? 'text-clay-butter fill-clay-butter' : 'text-clay-border'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-clay-text-muted">
                  {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {review.title && (
                <h4 className="font-semibold text-sm text-clay-text mt-3">{review.title}</h4>
              )}
              {review.body && (
                <p className="text-sm text-clay-text-secondary mt-1 leading-relaxed">{review.body}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
