'use client'
import { useCallback } from 'react'

export interface SizeSegment {
  label: string
  description: string
  sizes: string[]
  color: string
}

export const SIZE_SEGMENTS: SizeSegment[] = [
  {
    label: 'Small',
    description: 'Petite & Slim fits',
    sizes: ['XXS', 'XS', 'S'],
    color: '#3B82F6',
  },
  {
    label: 'Medium',
    description: 'Regular fits',
    sizes: ['M', 'L'],
    color: '#22C55E',
  },
  {
    label: 'Large',
    description: 'Plus & Relaxed fits',
    sizes: ['XL', 'XXL', '2XL', '3XL'],
    color: '#F97316',
  },
]

export const ALL_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL']
export const FREE_SIZE = 'FREE'

// Non-clothing sizes
export const SHOE_SIZES = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']
export const RING_SIZES = ['5', '6', '7', '8', '9', '10', '11', '12', '13', '14']

export type SizeType = 'clothing' | 'shoes' | 'rings' | 'free' | 'custom'

interface SizeSelectorProps {
  sizeType: SizeType
  selected: string[]
  onChange: (sizes: string[]) => void
  onSizeTypeChange: (type: SizeType) => void
}

export function SizeSelector({ sizeType, selected, onChange, onSizeTypeChange }: SizeSelectorProps) {
  const toggleSize = useCallback((size: string) => {
    if (selected.includes(size)) {
      onChange(selected.filter(s => s !== size))
    } else {
      onChange([...selected, size])
    }
  }, [selected, onChange])

  const selectSegment = useCallback((segment: SizeSegment) => {
    const allSelected = segment.sizes.every(s => selected.includes(s))
    if (allSelected) {
      onChange(selected.filter(s => !segment.sizes.includes(s)))
    } else {
      const merged = Array.from(new Set([...selected, ...segment.sizes]))
      onChange(merged)
    }
  }, [selected, onChange])

  const selectAll = useCallback(() => {
    const all = sizeType === 'clothing' ? ALL_SIZES : sizeType === 'shoes' ? SHOE_SIZES : RING_SIZES
    if (selected.length === all.length) {
      onChange([])
    } else {
      onChange([...all])
    }
  }, [sizeType, selected, onChange])

  return (
    <div className="space-y-4">
      {/* Size Type Selector */}
      <div className="flex gap-2">
        {[
          { key: 'clothing' as SizeType, label: 'Clothing' },
          { key: 'shoes' as SizeType, label: 'Shoes' },
          { key: 'rings' as SizeType, label: 'Rings' },
          { key: 'free' as SizeType, label: 'Free Size' },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => { onSizeTypeChange(t.key); onChange([]) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              sizeType === t.key
                ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]'
                : 'border-[var(--portal-border)] hover:border-[var(--portal-accent)]/50'
            }`}
            style={{ color: sizeType === t.key ? undefined : 'var(--portal-text)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Clothing Sizes with Segments */}
      {sizeType === 'clothing' && (
        <div className="space-y-3">
          {/* Segment quick-select buttons */}
          <div className="flex gap-2">
            {SIZE_SEGMENTS.map(seg => {
              const allSelected = seg.sizes.every(s => selected.includes(s))
              const someSelected = seg.sizes.some(s => selected.includes(s))
              return (
                <button
                  key={seg.label}
                  type="button"
                  onClick={() => selectSegment(seg)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    allSelected ? 'border-2' : someSelected ? 'border border-opacity-60' : 'border hover:border-opacity-60'
                  }`}
                  style={{
                    borderColor: allSelected || someSelected ? seg.color : 'var(--portal-border)',
                    background: allSelected ? `${seg.color}15` : 'transparent',
                    color: allSelected ? seg.color : 'var(--portal-text)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                  <span>{seg.label}</span>
                  <span className="text-[10px] opacity-60">({seg.sizes.join(', ')})</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-2 rounded-xl border text-xs font-medium transition-all"
              style={{ borderColor: 'var(--portal-border)', color: 'var(--portal-muted)' }}
            >
              {selected.length === ALL_SIZES.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Individual size pills */}
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map(size => {
              const isSelected = selected.includes(size)
              const segment = SIZE_SEGMENTS.find(seg => seg.sizes.includes(size))
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`w-12 h-10 rounded-xl flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isSelected ? 'shadow-md scale-105' : 'hover:scale-105'
                  }`}
                  style={{
                    borderColor: isSelected ? segment?.color || 'var(--portal-accent)' : 'var(--portal-border)',
                    background: isSelected ? `${segment?.color || 'var(--portal-accent)'}20` : 'var(--portal-elevated)',
                    color: isSelected ? segment?.color || 'var(--portal-accent)' : 'var(--portal-text)',
                  }}
                >
                  {size}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            {SIZE_SEGMENTS.map(seg => (
              <div key={seg.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
                <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{seg.label}: {seg.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shoe Sizes */}
      {sizeType === 'shoes' && (
        <div className="flex flex-wrap gap-2">
          {SHOE_SIZES.map(size => {
            const isSelected = selected.includes(size)
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isSelected ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10 scale-105' : 'border-[var(--portal-border)] hover:scale-105'
                }`}
                style={{ color: isSelected ? 'var(--portal-accent)' : 'var(--portal-text)' }}
              >
                {size}
              </button>
            )
          })}
        </div>
      )}

      {/* Ring Sizes */}
      {sizeType === 'rings' && (
        <div className="flex flex-wrap gap-2">
          {RING_SIZES.map(size => {
            const isSelected = selected.includes(size)
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  isSelected ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10 scale-105' : 'border-[var(--portal-border)] hover:scale-105'
                }`}
                style={{ color: isSelected ? 'var(--portal-accent)' : 'var(--portal-text)' }}
              >
                {size}
              </button>
            )
          })}
        </div>
      )}

      {/* Free Size */}
      {sizeType === 'free' && (
        <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>
          Free Size — one size fits all. No size variants will be created.
        </div>
      )}
    </div>
  )
}
