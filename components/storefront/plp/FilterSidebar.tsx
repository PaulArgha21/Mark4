'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'

interface Filters {
  priceMin?: number
  priceMax?: number
  rating?: number
  sort: string
}

interface FilterSidebarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  isMobileOpen: boolean
  onMobileClose: () => void
  totalResults: number
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
]

const PRICE_RANGES = [
  { label: 'Under \u20B91,000', min: 0, max: 1000 },
  { label: '\u20B91,000 - \u20B93,000', min: 1000, max: 3000 },
  { label: '\u20B93,000 - \u20B95,000', min: 3000, max: 5000 },
  { label: '\u20B95,000 - \u20B910,000', min: 5000, max: 10000 },
  { label: 'Above \u20B910,000', min: 10000, max: undefined },
]

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  return (
    <div className="border-b border-clay-divider py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-semibold text-clay-text"
      >
        {title}
        <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FilterSidebar({ filters, onFiltersChange, isMobileOpen, onMobileClose, totalResults }: FilterSidebarProps) {
  const content = (
    <div className="space-y-0">
      <div className="flex items-center justify-between pb-4 border-b border-clay-divider">
        <h3 className="font-semibold text-clay-text flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Filters
        </h3>
        <button
          onClick={() => onFiltersChange({ sort: 'popular' })}
          className="text-xs text-clay-rose font-medium hover:text-clay-rose-dark"
        >
          Clear All
        </button>
      </div>

      <FilterSection title="Sort By">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onFiltersChange({ ...filters, sort: opt.value })}
            className={cn(
              'block w-full text-left px-3 py-2 text-sm rounded-clay-sm transition-colors',
              filters.sort === opt.value
                ? 'bg-clay-blush text-clay-rose font-medium'
                : 'text-clay-text-secondary hover:bg-clay-bg-sunken'
            )}
          >
            {opt.label}
          </button>
        ))}
      </FilterSection>

      <FilterSection title="Price Range">
        {PRICE_RANGES.map(range => {
          const isActive = filters.priceMin === range.min && filters.priceMax === range.max
          return (
            <button
              key={range.label}
              onClick={() => onFiltersChange({
                ...filters,
                priceMin: isActive ? undefined : range.min,
                priceMax: isActive ? undefined : range.max,
              })}
              className={cn(
                'block w-full text-left px-3 py-2 text-sm rounded-clay-sm transition-colors',
                isActive
                  ? 'bg-clay-blush text-clay-rose font-medium'
                  : 'text-clay-text-secondary hover:bg-clay-bg-sunken'
              )}
            >
              {range.label}
            </button>
          )
        })}
      </FilterSection>

      <FilterSection title="Rating">
        {[4, 3, 2, 1].map(r => (
          <button
            key={r}
            onClick={() => onFiltersChange({
              ...filters,
              rating: filters.rating === r ? undefined : r,
            })}
            className={cn(
              'flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-clay-sm transition-colors',
              filters.rating === r
                ? 'bg-clay-blush text-clay-rose font-medium'
                : 'text-clay-text-secondary hover:bg-clay-bg-sunken'
            )}
          >
            <span className="text-clay-butter">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
            <span>& Above</span>
          </button>
        ))}
      </FilterSection>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="clay-card p-4 sticky top-20">
          {content}
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
            />
            <motion.aside
              className="fixed bottom-0 left-0 right-0 z-50 bg-clay-bg-surface rounded-t-3xl max-h-[80vh] overflow-y-auto lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springs.gentle}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-clay-text">Filters</h3>
                  <button onClick={onMobileClose} className="p-2">
                    <X size={20} />
                  </button>
                </div>
                {content}
                <div className="pt-4 mt-4 border-t border-clay-divider">
                  <ClayButton variant="primary" fullWidth onClick={onMobileClose}>
                    Show {totalResults} Results
                  </ClayButton>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
