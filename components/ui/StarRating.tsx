'use client'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
}

export function StarRating({ rating, reviewCount, size = 'sm', showCount = true, className }: StarRatingProps) {
  const sizeMap = {
    sm: { star: 12, text: 'text-xs' },
    md: { star: 16, text: 'text-sm' },
    lg: { star: 20, text: 'text-base' },
  }
  const s = sizeMap[size]

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(rating)
          const partial = !filled && i <= Math.ceil(rating) && rating % 1 > 0

          return (
            <Star
              key={i}
              size={s.star}
              className={cn(
                'transition-colors',
                filled
                  ? 'fill-clay-butter text-clay-butter'
                  : partial
                    ? 'fill-clay-butter/50 text-clay-butter'
                    : 'fill-clay-bg-sunken text-clay-border'
              )}
            />
          )
        })}
      </div>
      {showCount && (
        <span className={cn(s.text, 'text-clay-text-muted')}>
          {rating.toFixed(1)}
          {reviewCount !== undefined && ` (${reviewCount})`}
        </span>
      )}
    </div>
  )
}
