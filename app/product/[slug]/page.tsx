'use client'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, Share2, Truck, ShieldCheck, RotateCcw, Star,
  ChevronDown, Minus, Plus, ShoppingBag, Zap, Copy, Check,
} from 'lucide-react'
import Link from 'next/link'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { ProductGallery } from '@/components/storefront/pdp/ProductGallery'
import { SizeSelector } from '@/components/storefront/pdp/SizeSelector'
import { ColorSelector } from '@/components/storefront/pdp/ColorSelector'
import { ReviewsSection } from '@/components/storefront/pdp/ReviewsSection'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { ClayButton } from '@/components/ui/ClayButton'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { ClayProductCard } from '@/components/ui/ClayProductCard'
import { DeliveryEstimate } from '@/components/storefront/pdp/DeliveryEstimate'
import { ProductDetailSkeleton } from '@/components/ui/SkeletonLoaders'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { useWishlist } from '@/hooks/useWishlist'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: product, isLoading } = useSWR(`/api/storefront/products/${slug}`, fetcher)
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const router = useRouter()

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [openAccordion, setOpenAccordion] = useState<string | null>('details')

  // Track page view
  useEffect(() => {
    if (!product) return
    fetch('/api/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'page_view', productId: product.id }),
    }).catch(() => {})
  }, [product?.id])

  // Save to recently viewed (localStorage)
  useEffect(() => {
    if (!product) return
    try {
      const key = 'aprdite-recently-viewed'
      const raw = localStorage.getItem(key)
      const list: { id: string; slug: string; name: string; image: string; price: number; salePrice?: number | null }[] = raw ? JSON.parse(raw) : []
      const filtered = list.filter(i => i.id !== product.id)
      const image = product.media?.[0]?.url || ''
      filtered.unshift({ id: product.id, slug: product.slug, name: product.name, image, price: Number(product.basePrice), salePrice: product.salePrice ? Number(product.salePrice) : null })
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 12)))
    } catch { /* ignore */ }
  }, [product?.id])

  // Auto-select first color
  useEffect(() => {
    if (!product?.variants?.length) return
    const colors = Array.from(new Set(product.variants.map((v: any) => v.color).filter(Boolean)))
    if (colors.length > 0 && !selectedColor) setSelectedColor(colors[0] as string)
  }, [product, selectedColor])

  // Derive selected variant from color+size
  useEffect(() => {
    if (!product || !selectedColor || !selectedSize) {
      setSelectedVariantId(null)
      return
    }
    const variant = product.variants.find(
      (v: any) => v.color === selectedColor && v.size === selectedSize
    )
    setSelectedVariantId(variant?.id ?? null)
  }, [selectedColor, selectedSize, product])

  // Reset quantity when variant changes
  useEffect(() => { setQuantity(1) }, [selectedVariantId])

  const handleAddToCart = async () => {
    if (!selectedVariantId) {
      toast.error('Please select size and color')
      return
    }
    setAdding(true)
    try {
      await addToCart(product.id, selectedVariantId, quantity)
      toast.success(`${product.name} added to cart!`)
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setAdding(false)
    }
  }

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to buy', {
        action: { label: 'Sign In', onClick: () => router.push(`/login?redirect=/product/${slug}`) },
      })
      return
    }
    if (!selectedVariantId) { toast.error('Please select size and color'); return }
    setAdding(true)
    try {
      await addToCart(product.id, selectedVariantId, quantity)
      router.push('/checkout')
    } catch {
      toast.error('Failed to process')
    } finally {
      setAdding(false)
    }
  }

  const handleWishlist = async () => {
    setWishlistLoading(true)
    await toggleWishlist(product.id)
    setWishlistLoading(false)
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: product.name, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <StorefrontShell>
        <ProductDetailSkeleton />
      </StorefrontShell>
    )
  }

  if (!product) {
    return (
      <StorefrontShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <ShoppingBag size={64} className="mx-auto text-clay-text-muted mb-4" strokeWidth={1} />
            <h2 className="font-display text-2xl font-bold text-clay-text mb-2">Product not found</h2>
            <p className="text-clay-text-muted mb-6">The product you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <ClayButton variant="primary" onClick={() => router.push('/')}>Back to Shop</ClayButton>
          </div>
        </div>
      </StorefrontShell>
    )
  }

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.media?.map((m: { url: string }) => m.url) ?? [],
    description: product.description ?? product.shortDescription ?? '',
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      price: Number(product.salePrice ?? product.basePrice),
      priceCurrency: 'INR',
      availability: product.variants?.some((v: { availableQty: number }) => v.availableQty > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(product.averageRating > 0 && product.reviewCount > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.averageRating, reviewCount: product.reviewCount } }
      : {}),
  }

  const uniqueColors = Array.from(new Set(product.variants.map((v: any) => v.color).filter(Boolean))) as string[]
  const sizesForColor = product.variants
    .filter((v: any) => !selectedColor || v.color === selectedColor)
    .map((v: any) => ({ size: v.size, qty: v.availableQty }))

  const selectedVariant = product.variants.find((v: any) => v.id === selectedVariantId)
  const maxQty = selectedVariant ? Math.min(selectedVariant.availableQty, 10) : 10
  const isOutOfStock = selectedVariant?.availableQty === 0
  const totalInStock = product.variants.reduce((sum: number, v: any) => sum + (v.availableQty || 0), 0)
  const hasDiscount = product.salePrice && product.salePrice < product.basePrice
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.salePrice) / Number(product.basePrice)) * 100)
    : 0

  const toggleAccordion = (key: string) => setOpenAccordion(openAccordion === key ? null : key)

  return (
    <StorefrontShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="max-w-7xl mx-auto px-4 py-2 lg:py-8">
          {/* Breadcrumb — hidden on mobile for app feel */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs text-clay-text-muted mb-6">
            <Link href="/" className="hover:text-clay-text transition-colors">Home</Link>
            <span>/</span>
            {product.category && (
              <>
                <Link href={`/category/${product.category.slug}`} className="hover:text-clay-text transition-colors">
                  {product.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-clay-text truncate max-w-[200px]">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-[1fr_440px] gap-8 lg:gap-14">
            {/* LEFT: Sticky Gallery */}
            <div className="lg:sticky lg:top-20 lg:self-start">
              <ProductGallery
                images={product.media?.map((m: any) => m.url) || product.images}
                productId={product.id}
              />
            </div>

            {/* RIGHT: Product Info */}
            <motion.div
              className="space-y-6"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {/* Brand + Badges */}
              <motion.div variants={fadeUpVariants} className="space-y-2">
                {product.brand && (
                  <p className="text-xs text-clay-text-muted font-semibold uppercase tracking-[0.2em]">
                    {product.brand}
                  </p>
                )}
                <h1 className="font-display text-2xl lg:text-[28px] font-bold text-clay-text leading-tight">
                  {product.name}
                </h1>
                <div className="flex items-center flex-wrap gap-2">
                  {discountPercent > 0 && <ClayBadge variant="sale" size="sm">{discountPercent}% OFF</ClayBadge>}
                  {product.isNew && <ClayBadge variant="new" size="sm">NEW</ClayBadge>}
                  {totalInStock <= 5 && totalInStock > 0 && <ClayBadge variant="trending" size="sm">Few Left</ClayBadge>}
                </div>
              </motion.div>

              {/* Rating */}
              {(product.averageRating > 0 || product.reviewCount > 0) && (
                <motion.div variants={fadeUpVariants} className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s} size={14}
                        className={s <= Math.round(product.averageRating) ? 'text-clay-butter fill-clay-butter' : 'text-clay-border'}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-clay-text">{product.averageRating?.toFixed(1)}</span>
                  <span className="text-sm text-clay-text-muted">({product.reviewCount} reviews)</span>
                </motion.div>
              )}

              {/* Price */}
              <motion.div variants={fadeUpVariants} className="flex items-baseline gap-3">
                <PriceDisplay
                  price={product.basePrice + (selectedVariant?.priceDelta || 0)}
                  salePrice={product.salePrice ? product.salePrice + (selectedVariant?.priceDelta || 0) : undefined}
                  variant="pdp"
                />
                {hasDiscount && (
                  <span className="text-xs text-clay-sage font-medium bg-clay-sage/10 px-2 py-0.5 rounded-full">
                    You save {formatPrice(Number(product.basePrice) - Number(product.salePrice))}
                  </span>
                )}
              </motion.div>

              {/* Short Description */}
              {product.shortDescription && (
                <motion.p variants={fadeUpVariants} className="text-sm text-clay-text-secondary leading-relaxed">
                  {product.shortDescription}
                </motion.p>
              )}

              <div className="border-t border-clay-divider" />

              {/* Color Selector */}
              {uniqueColors.length > 0 && (
                <motion.div variants={fadeUpVariants}>
                  <ColorSelector
                    colors={uniqueColors.map((c: string) => {
                      const v = product.variants.find((vv: any) => vv.color === c)
                      return { name: c, hex: v?.colorHex }
                    })}
                    selected={selectedColor}
                    onSelect={setSelectedColor}
                  />
                </motion.div>
              )}

              {/* Size Selector */}
              {sizesForColor.length > 0 && (
                <motion.div variants={fadeUpVariants}>
                  <SizeSelector
                    sizes={sizesForColor}
                    selected={selectedSize}
                    onSelect={setSelectedSize}
                  />
                </motion.div>
              )}

              {/* Stock indicator */}
              <AnimatePresence mode="wait">
                {selectedVariant && (
                  <motion.div
                    key={selectedVariantId}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-clay-error' : selectedVariant.availableQty <= 5 ? 'bg-clay-butter' : 'bg-clay-sage'}`} />
                    <span className={`text-sm font-medium ${isOutOfStock ? 'text-clay-error' : 'text-clay-sage'}`}>
                      {isOutOfStock
                        ? 'Out of Stock'
                        : selectedVariant.availableQty <= 5
                          ? `Only ${selectedVariant.availableQty} left — order soon!`
                          : 'In Stock'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delivery Estimate */}
              <motion.div variants={fadeUpVariants} className="pt-1">
                <DeliveryEstimate variantId={selectedVariantId} />
              </motion.div>

              {/* Quantity + CTA */}
              <motion.div variants={fadeUpVariants} className="space-y-3 pt-1">
                {/* Quantity Selector */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-clay-text">Qty</span>
                  <div className="flex items-center border border-clay-border rounded-clay-md">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center text-clay-text-muted hover:text-clay-text disabled:opacity-30 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-semibold text-clay-text">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(maxQty, q + 1))}
                      disabled={quantity >= maxQty}
                      className="w-10 h-10 flex items-center justify-center text-clay-text-muted hover:text-clay-text disabled:opacity-30 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Add to Cart + Wishlist */}
                <div className="flex gap-3">
                  <ClayButton
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    onClick={handleAddToCart}
                    loading={adding}
                    disabled={!selectedVariantId || isOutOfStock}
                  >
                    <ShoppingBag size={18} /> Add to Cart
                  </ClayButton>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleWishlist}
                    disabled={wishlistLoading}
                    className="w-12 h-12 rounded-clay-md border border-clay-border flex items-center justify-center hover:border-clay-rose hover:bg-clay-blush transition-all"
                  >
                    <Heart
                      size={20}
                      className={`transition-colors ${
                        isWishlisted(product.id)
                          ? 'fill-clay-rose text-clay-rose'
                          : 'text-clay-text-muted'
                      }`}
                    />
                  </motion.button>
                </div>

                {/* Buy Now */}
                <ClayButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={!selectedVariantId || isOutOfStock}
                  onClick={handleBuyNow}
                >
                  <Zap size={16} /> Buy Now
                </ClayButton>
              </motion.div>

              {/* Trust Badges */}
              <motion.div variants={fadeUpVariants} className="grid grid-cols-3 gap-2.5 pt-2">
                {[
                  { icon: Truck, label: 'Free Shipping', sub: 'Orders above ₹999' },
                  { icon: ShieldCheck, label: '100% Authentic', sub: 'Genuine products' },
                  { icon: RotateCcw, label: 'Easy Returns', sub: '7-day return policy' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center text-center p-3 bg-clay-bg-sunken rounded-clay-md border border-clay-border-light">
                    <Icon size={18} className="text-clay-sage mb-1.5" />
                    <p className="text-[11px] font-semibold text-clay-text">{label}</p>
                    <p className="text-[10px] text-clay-text-muted mt-0.5">{sub}</p>
                  </div>
                ))}
              </motion.div>

              <div className="border-t border-clay-divider" />

              {/* Accordion Sections */}
              <motion.div variants={fadeUpVariants} className="space-y-0">
                {/* Product Details */}
                <div className="border-b border-clay-divider">
                  <button
                    onClick={() => toggleAccordion('details')}
                    className="w-full flex items-center justify-between py-4 text-sm font-semibold text-clay-text"
                  >
                    Product Details
                    <ChevronDown size={16} className={`transition-transform ${openAccordion === 'details' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === 'details' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="pb-4 text-sm text-clay-text-secondary leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: product.description ?? '<p>No description available.</p>' }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Shipping & Returns */}
                <div className="border-b border-clay-divider">
                  <button
                    onClick={() => toggleAccordion('shipping')}
                    className="w-full flex items-center justify-between py-4 text-sm font-semibold text-clay-text"
                  >
                    Shipping & Returns
                    <ChevronDown size={16} className={`transition-transform ${openAccordion === 'shipping' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === 'shipping' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 text-sm text-clay-text-secondary space-y-2">
                          <p>Free standard shipping on orders above ₹999.</p>
                          <p>Express delivery available at checkout for select pincodes.</p>
                          <p>Easy 7-day returns. Items must be unused with tags attached.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Share */}
              <motion.div variants={fadeUpVariants}>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 text-sm text-clay-text-muted hover:text-clay-text transition-colors group"
                >
                  {copied ? <Check size={16} className="text-clay-sage" /> : <Share2 size={16} />}
                  <span className="group-hover:underline">{copied ? 'Link copied!' : 'Share this product'}</span>
                </button>
              </motion.div>
            </motion.div>
          </div>

          {/* Related Products */}
          {product.sameCollectionProducts?.length > 0 && (
            <div className="mt-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-clay-text">You Might Also Like</h2>
              </div>
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {product.sameCollectionProducts.map((p: any) => (
                  <motion.div key={p.id} variants={fadeUpVariants}>
                    <ClayProductCard product={p} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          {/* Reviews */}
          <div className="mt-12 md:mt-20">
            <ReviewsSection
              productId={product.id}
              initialReviews={product.reviews || []}
              ratingDistribution={product.ratingDistribution || []}
              averageRating={product.averageRating || 0}
              reviewCount={product.reviewCount || 0}
            />
          </div>
        </div>
      </motion.div>

      {/* Sticky Mobile Add-to-Cart Bar */}
      <div className="fixed bottom-[60px] left-0 right-0 z-30 md:hidden px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="glass-premium rounded-2xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-clay-text-muted truncate">{product.name}</p>
            <PriceDisplay
              price={product.basePrice + (selectedVariant?.priceDelta || 0)}
              salePrice={product.salePrice ? product.salePrice + (selectedVariant?.priceDelta || 0) : undefined}
              variant="inline"
            />
          </div>
          <motion.button
            className="flex-shrink-0 bg-clay-rose text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
            onClick={handleAddToCart}
            disabled={!selectedVariantId || isOutOfStock || adding}
            whileTap={{ scale: 0.95 }}
            style={{ boxShadow: '0 0 15px rgba(214,51,108,0.25)' }}
          >
            <ShoppingBag size={15} />
            {adding ? '...' : isOutOfStock ? 'Sold Out' : 'Add to Cart'}
          </motion.button>
        </div>
      </div>
    </StorefrontShell>
  )
}
