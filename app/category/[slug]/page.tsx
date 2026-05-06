'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { SlidersHorizontal, Grid3X3, LayoutGrid } from 'lucide-react'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { ClayProductCard } from '@/components/ui/ClayProductCard'
import { ProductGridSkeleton } from '@/components/ui/SkeletonLoaders'
import { FilterSidebar } from '@/components/storefront/plp/FilterSidebar'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { useSizePreference } from '@/hooks/useSizePreference'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [filters, setFilters] = useState<{
    priceMin?: number; priceMax?: number; rating?: number; sort: string
  }>({ sort: 'popular' })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [gridCols, setGridCols] = useState<2 | 3 | 4>(3)

  // Fetch all categories to resolve slug → categoryId
  const { data: categories } = useSWR('/api/storefront/categories', fetcher)
  const category = categories?.flatMap((c: { id: string; slug: string; name: string; children?: { id: string; slug: string; name: string }[] }) =>
    [c, ...(c.children || [])]
  ).find((c: { slug: string }) => c.slug === slug)

  const { preferredSize } = useSizePreference()

  // Build query string
  const qs = new URLSearchParams()
  if (category?.id) qs.set('categoryId', category.id)
  if (filters.priceMin) qs.set('priceMin', String(filters.priceMin))
  if (filters.priceMax) qs.set('priceMax', String(filters.priceMax))
  if (filters.rating) qs.set('rating', String(filters.rating))
  if (preferredSize) qs.set('size', preferredSize)
  qs.set('sort', filters.sort)

  const { data, isLoading } = useSWR(
    category?.id ? `/api/storefront/products?${qs.toString()}` : null,
    fetcher
  )

  const displayName = category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <StorefrontShell>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-clay-text">
            {displayName}
          </h1>
          <p className="text-sm text-clay-text-muted mt-1">
            {data?.pagination?.total ?? 0} products
          </p>
        </motion.div>

        {/* Mobile filter bar */}
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 clay-surface text-sm font-medium text-clay-text"
          >
            <SlidersHorizontal size={16} /> Filters
          </button>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="flex-1 py-2.5 px-3 clay-surface text-sm font-medium text-clay-text border-none"
          >
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low-High</option>
            <option value="price_desc">Price: High-Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <FilterSidebar
            filters={filters}
            onFiltersChange={setFilters}
            isMobileOpen={mobileFiltersOpen}
            onMobileClose={() => setMobileFiltersOpen(false)}
            totalResults={data?.pagination?.total ?? 0}
          />

          {/* Product Grid */}
          <div className="flex-1">
            {/* Grid controls (desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-4">
              <p className="text-sm text-clay-text-muted">
                Showing {data?.items?.length ?? 0} of {data?.pagination?.total ?? 0} products
              </p>
              <div className="flex items-center gap-1">
                {[2, 3, 4].map((cols) => (
                  <button
                    key={cols}
                    onClick={() => setGridCols(cols as 2 | 3 | 4)}
                    className={cn(
                      'p-2 rounded-clay-sm transition-colors',
                      gridCols === cols ? 'bg-clay-bg-sunken text-clay-text' : 'text-clay-text-muted hover:text-clay-text'
                    )}
                  >
                    {cols === 2 ? <LayoutGrid size={16} /> : <Grid3X3 size={16} />}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <ProductGridSkeleton count={8} />
            ) : (
              <motion.div
                className={cn(
                  'grid gap-3 md:gap-4',
                  gridCols === 2 && 'grid-cols-2',
                  gridCols === 3 && 'grid-cols-2 lg:grid-cols-3',
                  gridCols === 4 && 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
                )}
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {data?.items?.map((product: any) => (
                  <motion.div key={product.id} variants={fadeUpVariants}>
                    <ClayProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {data?.items?.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <p className="text-6xl mb-4">🔍</p>
                <h3 className="font-display text-xl font-bold text-clay-text mb-2">No products found</h3>
                <p className="text-sm text-clay-text-muted">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StorefrontShell>
  )
}
