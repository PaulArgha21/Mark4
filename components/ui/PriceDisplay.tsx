'use client'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'

interface PriceDisplayProps {
  price: number
  salePrice?: number | null
  variant?: 'card' | 'pdp' | 'cart' | 'inline'
  className?: string
}

export function PriceDisplay({ price, salePrice, variant = 'card', className }: PriceDisplayProps) {
  const hasDiscount = salePrice && salePrice < price
  const discountPercent = hasDiscount
    ? Math.round((1 - salePrice / price) * 100)
    : 0

  const sizeMap = {
    card:   { price: 'text-lg font-bold', original: 'text-sm', discount: 'text-xs' },
    pdp:    { price: 'text-2xl font-bold', original: 'text-base', discount: 'text-sm' },
    cart:   { price: 'text-base font-semibold', original: 'text-sm', discount: 'text-xs' },
    inline: { price: 'text-sm font-semibold', original: 'text-xs', discount: 'text-[10px]' },
  }

  const sizes = sizeMap[variant]

  return (
    <div className={cn('flex items-baseline gap-2 flex-wrap', className)}>
      <span className={cn(sizes.price, hasDiscount ? 'text-clay-rose' : 'text-clay-text')}>
        {formatPrice(hasDiscount ? salePrice : price)}
      </span>
      {hasDiscount && (
        <>
          <span className={cn(sizes.original, 'text-clay-text-muted line-through')}>
            {formatPrice(price)}
          </span>
          <span className={cn(sizes.discount, 'font-semibold text-clay-sage')}>
            {discountPercent}% OFF
          </span>
        </>
      )}
    </div>
  )
}
