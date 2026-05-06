'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cardHoverVariants, springs, imageRevealVariants } from '@/lib/animations'
import { PriceDisplay } from './PriceDisplay'
import { StarRating } from './StarRating'
import { ClayBadge } from './ClayBadge'
import { useWishlist } from '@/hooks/useWishlist'
import { useSizePreference } from '@/hooks/useSizePreference'
import { useRouter } from 'next/navigation'

export interface ProductCardData {
  id: string
  slug: string
  name: string
  brand?: string | null
  images: string[]
  basePrice: number
  salePrice?: number | null
  averageRating: number
  reviewCount: number
  availableSizes?: string[]
  colors?: { name: string; hex?: string }[]
  discountPercent?: number
  trendingScore?: number | null
  isNew?: boolean
}

interface ClayProductCardProps {
  product: ProductCardData
  className?: string
  priority?: boolean
}

export function ClayProductCard({ product, className, priority = false }: ClayProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)
  const { isWishlisted, toggleWishlist } = useWishlist()
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const { preferredSize } = useSizePreference()
  const router = useRouter()
  const hasPrefSize = preferredSize && product.availableSizes?.includes(preferredSize)

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    setWishlistLoading(true)
    await toggleWishlist(product.id)
    setWishlistLoading(false)
  }

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    router.push(`/product/${product.slug}`)
  }

  const hasDiscount = product.salePrice && product.salePrice < product.basePrice
  const discount = hasDiscount
    ? Math.round((1 - product.salePrice! / product.basePrice) * 100)
    : 0

  return (
    <div className={cn('perspective-1000', className)}>
    <motion.div
      className="overflow-hidden group relative shine-effect rounded-2xl bg-clay-bg-elevated border border-clay-border-light"
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      onMouseEnter={() => {
        setIsHovered(true)
        if (product.images.length > 1) setImageIndex(1)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        setImageIndex(0)
      }}
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: 'var(--clay-shadow-md)',
      }}
    >
      {/* Image Container */}
      <Link href={`/product/${product.slug}`} className="block relative aspect-[3/4] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={imageIndex}
            variants={imageRevealVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0"
          >
            <Image
              src={product.images[imageIndex] || '/placeholder.svg'}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
            />
          </motion.div>
        </AnimatePresence>

        {/* Badges */}
        <div className="absolute top-2 left-2 md:top-2.5 md:left-2.5 flex flex-col gap-1 md:gap-1.5 z-10">
          {discount > 0 && (
            <ClayBadge variant="sale" size="sm" animate>
              -{discount}%
            </ClayBadge>
          )}
          {product.isNew && (
            <ClayBadge variant="new" size="sm">NEW</ClayBadge>
          )}
          {product.trendingScore && product.trendingScore > 50 && (
            <ClayBadge variant="trending" size="sm">TRENDING</ClayBadge>
          )}
          {hasPrefSize && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)' }}>
              {preferredSize}
            </span>
          )}
        </div>

        {/* Quick Actions Overlay — Glassmorphic */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent flex items-end justify-center pb-3 gap-2 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                className="w-9 h-9 rounded-full glass-premium flex items-center justify-center hover:scale-110 transition-transform"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                transition={{ ...springs.bouncy, delay: 0 }}
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
              >
                <Heart
                  size={16}
                  className={cn(
                    'transition-colors',
                    isWishlisted(product.id) ? 'fill-clay-rose text-clay-rose' : 'text-clay-text'
                  )}
                />
              </motion.button>
              <motion.button
                className="w-9 h-9 rounded-full bg-clay-rose text-white flex items-center justify-center hover:scale-110 transition-transform glow-rose-sm"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                transition={{ ...springs.bouncy, delay: 0.05 }}
                onClick={(e) => {
                  e.preventDefault()
                  router.push(`/product/${product.slug}`)
                }}
              >
                <ShoppingBag size={16} />
              </motion.button>
              <motion.button
                className="w-9 h-9 rounded-full glass-premium flex items-center justify-center hover:scale-110 transition-transform"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                transition={{ ...springs.bouncy, delay: 0.1 }}
                onClick={handleQuickView}
              >
                <Eye size={16} className="text-clay-text" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>

      {/* Product Info */}
      <div className="p-2 md:p-3 space-y-1">
        {product.brand && (
          <p className="text-[10px] md:text-[11px] text-clay-text-muted font-medium uppercase tracking-wider truncate">
            {product.brand}
          </p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-xs md:text-sm font-medium text-clay-text line-clamp-2 leading-snug hover:text-clay-rose transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.averageRating > 0 && (
          <StarRating
            rating={product.averageRating}
            reviewCount={product.reviewCount}
            size="sm"
          />
        )}

        <PriceDisplay
          price={product.basePrice}
          salePrice={product.salePrice}
          variant="card"
        />

        {/* Color Dots */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {product.colors.slice(0, 5).map((color) => (
              <span
                key={color.name}
                className="w-3.5 h-3.5 rounded-full border border-clay-border shadow-sm"
                style={{ backgroundColor: color.hex || '#ccc' }}
                title={color.name}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[10px] text-clay-text-muted">
                +{product.colors.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
    </div>
  )
}
