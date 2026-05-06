'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Search as SearchIcon, X } from 'lucide-react'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { ClayProductCard } from '@/components/ui/ClayProductCard'
import { ProductGridSkeleton } from '@/components/ui/SkeletonLoaders'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { useSizePreference } from '@/hooks/useSizePreference'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export default function SearchPage() {
  return (
    <Suspense fallback={<StorefrontShell><div className="min-h-screen" /></StorefrontShell>}>
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const { preferredSize } = useSizePreference()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const searchUrl = debouncedQuery.length >= 2
    ? `/api/storefront/products?q=${encodeURIComponent(debouncedQuery)}${preferredSize ? `&size=${encodeURIComponent(preferredSize)}` : ''}`
    : null

  const { data, isLoading } = useSWR(searchUrl, fetcher)

  return (
    <StorefrontShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <motion.div
          className="max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-clay-text-muted" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for products, brands, categories..."
              autoFocus
              className="w-full bg-clay-bg-surface border border-clay-border rounded-clay-xl pl-12 pr-10 py-4 text-base focus:outline-none focus:ring-2 focus:ring-clay-rose focus:border-transparent shadow-clay-md transition-all"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setDebouncedQuery('') }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-clay-text-muted hover:text-clay-text"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Results */}
        {debouncedQuery.length < 2 ? (
          <div className="text-center py-16">
            <SearchIcon size={48} className="mx-auto text-clay-text-muted mb-4" strokeWidth={1} />
            <h2 className="font-display text-xl font-bold text-clay-text mb-2">Search Aprdite</h2>
            <p className="text-sm text-clay-text-muted">Enter at least 2 characters to search</p>
          </div>
        ) : isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : data?.items?.length > 0 ? (
          <>
            <p className="text-sm text-clay-text-muted mb-4">
              {data.pagination.total} results for &ldquo;{debouncedQuery}&rdquo;
            </p>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {data.items.map((product: any) => (
                <motion.div key={product.id} variants={fadeUpVariants}>
                  <ClayProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-6xl mb-4">🔍</p>
            <h3 className="font-display text-xl font-bold text-clay-text mb-2">No results found</h3>
            <p className="text-sm text-clay-text-muted">
              We couldn&apos;t find anything for &ldquo;{debouncedQuery}&rdquo;. Try a different search.
            </p>
          </div>
        )}
      </div>
    </StorefrontShell>
  )
}
