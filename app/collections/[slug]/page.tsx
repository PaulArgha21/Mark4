'use client'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { ClayProductCard, type ProductCardData } from '@/components/ui/ClayProductCard'
import { ProductGridSkeleton } from '@/components/ui/SkeletonLoaders'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { useSizePreference } from '@/hooks/useSizePreference'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export default function CollectionPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: collection, isLoading } = useSWR(`/api/storefront/collections/${slug}`, fetcher)
  const { preferredSize } = useSizePreference()

  if (isLoading) {
    return <StorefrontShell><ProductGridSkeleton /></StorefrontShell>
  }

  if (!collection) {
    return (
      <StorefrontShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-5xl mb-4">🗂️</p>
            <h2 className="font-display text-2xl font-bold text-clay-text mb-2">Collection not found</h2>
            <p className="text-clay-text-muted">This collection may have been removed or is no longer available.</p>
          </div>
        </div>
      </StorefrontShell>
    )
  }

  return (
    <StorefrontShell>
      <div className="min-h-screen">
        {/* Banner */}
        {collection.bannerUrl && (
          <div className="relative w-full h-48 md:h-72 overflow-hidden">
            <img
              src={collection.bannerUrl}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 md:p-10">
              <h1 className="font-display text-3xl md:text-5xl font-bold text-white">{collection.name}</h1>
            </div>
          </div>
        )}

        <motion.div
          className="max-w-7xl mx-auto px-4 py-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {!collection.bannerUrl && (
            <motion.h1 variants={fadeUpVariants} className="font-display text-2xl md:text-4xl font-bold text-clay-text mb-2">
              {collection.name}
            </motion.h1>
          )}

          {collection.description && (
            <motion.p variants={fadeUpVariants} className="text-clay-text-muted mb-6 max-w-2xl">
              {collection.description}
            </motion.p>
          )}

          <motion.p variants={fadeUpVariants} className="text-sm text-clay-text-muted mb-6">
            {collection.products?.length ?? 0} products
          </motion.p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {(preferredSize
              ? collection.products?.filter((p: { availableSizes?: string[] }) => !p.availableSizes?.length || p.availableSizes.includes(preferredSize))
              : collection.products
            )?.map((p: { id: string; slug: string; name: string; brand?: string; image?: string; basePrice: number; salePrice?: number; averageRating?: number; reviewCount?: number; availableSizes?: string[] }) => {
              const card: ProductCardData = {
                id: p.id, slug: p.slug, name: p.name, brand: p.brand,
                images: p.image ? [p.image] : [],
                basePrice: Number(p.basePrice), salePrice: p.salePrice ? Number(p.salePrice) : null,
                averageRating: p.averageRating ?? 0, reviewCount: p.reviewCount ?? 0,
              }
              return (
                <motion.div key={p.id} variants={fadeUpVariants}>
                  <ClayProductCard product={card} />
                </motion.div>
              )
            })}
          </div>

          {(!collection.products || collection.products.length === 0) && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">✨</p>
              <p className="text-clay-text-muted">This collection is being curated. Check back soon!</p>
            </div>
          )}
        </motion.div>
      </div>
    </StorefrontShell>
  )
}
