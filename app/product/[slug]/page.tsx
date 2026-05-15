'use client'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Heart, Share2, Truck, ShieldCheck, RotateCcw, Star,
  ChevronDown, Minus, Plus, ShoppingBag, Zap, Copy, Check,
  ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock, Eye, Gift,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
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
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

// Horizontal scrollable recommendation row
function RecoRow({ title, icon: Icon, items, color = '#7c3aed' }: {
  title: string
  icon: React.ElementType
  items: any[]
  color?: string
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const scrollBy = (dir: number) => rowRef.current?.scrollBy({ left: dir * 180, behavior: 'smooth' })
  if (!items?.length) return null
  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${color}20` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <h2 className="font-bold text-base text-clay-text">{title}</h2>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scrollBy(-1)} className="w-7 h-7 rounded-full border border-clay-border flex items-center justify-center hover:bg-clay-bg-sunken transition-colors">
            <ChevronLeft size={14} className="text-clay-text-muted" />
          </button>
          <button onClick={() => scrollBy(1)} className="w-7 h-7 rounded-full border border-clay-border flex items-center justify-center hover:bg-clay-bg-sunken transition-colors">
            <ChevronRight size={14} className="text-clay-text-muted" />
          </button>
        </div>
      </div>
      <div
        ref={rowRef}
        className="flex gap-3 overflow-x-auto pb-3 px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((p: any) => (
          <div key={p.id} className="flex-shrink-0 w-[160px] snap-start">
            <ClayProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  )
}

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
  const [atcVisible, setAtcVisible] = useState(false)
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([])
  const lastScrollY = useRef(0)
  const ctaRef = useRef<HTMLDivElement>(null)

  // Track page view
  useEffect(() => {
    if (!product) return
    fetch('/api/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'page_view', productId: product.id }),
    }).catch(() => {})
  }, [product?.id])

  // Load recently viewed IDs for recommendations
  useEffect(() => {
    try {
      const raw = localStorage.getItem('aprdite-recently-viewed')
      const list: { id: string }[] = raw ? JSON.parse(raw) : []
      setRecentlyViewedIds(list.map(i => i.id))
    } catch { /* ignore */ }
  }, [])

  // Fetch recommendations after product + rv IDs are ready
  const rvParam = recentlyViewedIds.slice(0, 8).join(',')
  const { data: recos } = useSWR(
    product ? `/api/storefront/products/${slug}/recommendations?rv=${rvParam}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

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

  // Scroll handler: ATC bar hides when scrolling DOWN past CTA, re-appears scrolling UP
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const atcThreshold = (ctaRef.current?.getBoundingClientRect().bottom ?? 400) + currentY
      if (currentY < atcThreshold - 200) {
        setAtcVisible(false)
        lastScrollY.current = currentY
        return
      }
      const scrollingDown = currentY > lastScrollY.current
      if (scrollingDown) {
        setAtcVisible(false)
      } else {
        setAtcVisible(true)
      }
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
              <motion.div ref={ctaRef} variants={fadeUpVariants} className="space-y-3 pt-1">
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

          {/* ── Recommendation Sections ── */}
          <RecoRow
            title="Top Matches for You"
            icon={Sparkles}
            items={recos?.topMatches}
            color="#7c3aed"
          />
          <RecoRow
            title="People Also Buy"
            icon={TrendingUp}
            items={recos?.peopleAlsoBuy}
            color="#d6336c"
          />
          <RecoRow
            title="Just Because You Saw This"
            icon={Eye}
            items={recos?.justBecauseYouSaw}
            color="#0ea5e9"
          />
          <RecoRow
            title="Your Personalised Picks"
            icon={Gift}
            items={recos?.personalised}
            color="#f59e0b"
          />

          {/* Recently Viewed */}
          {recentlyViewedIds.length > 1 && (
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-4 px-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10">
                  <Clock size={16} className="text-emerald-500" />
                </div>
                <h2 className="font-bold text-base text-clay-text">Recently Viewed</h2>
              </div>
              <div
                className="flex gap-3 overflow-x-auto pb-3 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none' }}
              >
                {recentlyViewedIds.filter(id => id !== product.id).slice(0, 8).map(id => {
                  try {
                    const raw = localStorage.getItem('aprdite-recently-viewed')
                    const list: any[] = raw ? JSON.parse(raw) : []
                    const item = list.find(i => i.id === id)
                    if (!item) return null
                    return (
                      <Link key={id} href={`/product/${item.slug}`} className="flex-shrink-0 w-[130px] snap-start group">
                        <div className="aspect-square rounded-xl overflow-hidden bg-clay-bg-sunken mb-2 relative">
                          {item.image ? (
                            <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="130px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag size={24} className="text-clay-text-muted" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium text-clay-text truncate">{item.name}</p>
                        <p className="text-xs font-bold text-clay-rose mt-0.5">₹{(item.salePrice ?? item.price).toLocaleString('en-IN')}</p>
                      </Link>
                    )
                  } catch { return null }
                })}
              </div>
            </div>
          )}

          {/* ── Reviews ── */}
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

      {/* ── Animated Sticky Mobile Add-to-Cart Bar ── */}
      {/* Hides when scrolling DOWN, slides back UP when scrolling UP */}
      <AnimatePresence>
        {atcVisible && (
          <motion.div
            key="sticky-atc"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]"
            style={{ filter: 'drop-shadow(0 -8px 24px rgba(0,0,0,0.12))' }}
          >
            <div className="mx-3 mb-3 rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 -4px 30px rgba(0,0,0,0.10), 0 2px 0 rgba(255,255,255,0.6) inset',
              }}
            >
              {/* Selection reminder if no size/color */}
              {!selectedVariantId && (selectedColor || selectedSize) && (
                <div className="px-4 pt-2.5 pb-0 text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {!selectedSize ? 'Select a size to continue' : 'Select a color to continue'}
                </div>
              )}
              <div className="flex items-center gap-3 p-3">
                {/* Product thumbnail */}
                {product.media?.[0]?.url && (
                  <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 relative">
                    <Image src={product.media[0].url} alt={product.name} fill className="object-cover" sizes="44px" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-clay-text-muted truncate leading-tight">{product.name}</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-clay-text">
                      ₹{((product.salePrice ?? product.basePrice) + (selectedVariant?.priceDelta || 0)).toLocaleString('en-IN')}
                    </span>
                    {product.salePrice && (
                      <span className="text-[10px] text-clay-text-muted line-through">
                        ₹{(product.basePrice + (selectedVariant?.priceDelta || 0)).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddToCart}
                  disabled={!selectedVariantId || isOutOfStock || adding}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
                  style={{
                    background: isOutOfStock
                      ? '#9ca3af'
                      : 'linear-gradient(135deg, #d6336c 0%, #9333ea 100%)',
                    boxShadow: isOutOfStock ? 'none' : '0 4px 16px rgba(214,51,108,0.35)',
                  }}
                >
                  {adding ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Adding…
                    </span>
                  ) : isOutOfStock ? (
                    'Sold Out'
                  ) : (
                    <>
                      <ShoppingBag size={15} />
                      Add to Cart
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StorefrontShell>
  )
}
