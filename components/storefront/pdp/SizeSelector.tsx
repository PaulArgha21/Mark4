'use client'
import { motion } from 'framer-motion'
import { Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'

interface SizeOption {
  size: string
  qty: number
}

interface SizeSelectorProps {
  sizes: SizeOption[]
  selected: string | null
  onSelect: (size: string) => void
  onSizeGuideOpen?: () => void
}

export function SizeSelector({ sizes, selected, onSelect, onSizeGuideOpen }: SizeSelectorProps) {
  // Deduplicate sizes
  const uniqueSizes = sizes.reduce<SizeOption[]>((acc, s) => {
    if (!acc.find(a => a.size === s.size)) acc.push(s)
    return acc
  }, [])

  if (!uniqueSizes.length) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-clay-text">
          Size{selected && <span className="font-normal text-clay-text-muted ml-2">— {selected}</span>}
        </h4>
        {onSizeGuideOpen && (
          <button
            onClick={onSizeGuideOpen}
            className="flex items-center gap-1 text-xs text-clay-rose font-medium hover:text-clay-rose-dark"
          >
            <Ruler size={12} /> Size Guide
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueSizes.map(({ size, qty }) => {
          const isOutOfStock = qty <= 0
          const isSelected = selected === size

          return (
            <motion.button
              key={size}
              onClick={() => !isOutOfStock && onSelect(size)}
              disabled={isOutOfStock}
              className={cn(
                'min-w-[48px] h-11 px-3 rounded-clay-sm border text-sm font-medium transition-all',
                isSelected
                  ? 'bg-clay-midnight text-white border-clay-midnight shadow-clay-md'
                  : isOutOfStock
                    ? 'bg-clay-bg-sunken text-clay-text-muted border-clay-border-light line-through cursor-not-allowed opacity-50'
                    : 'bg-clay-bg-surface text-clay-text border-clay-border hover:border-clay-midnight'
              )}
              whileTap={isOutOfStock ? undefined : { scale: 0.95 }}
              transition={springs.bouncy}
            >
              {size}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
