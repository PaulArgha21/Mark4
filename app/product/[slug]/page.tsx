'use client'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, Share2, Truck, ShieldCheck, RotateCcw, Star,
  ChevronDown, Minus, Plus, ShoppingBag, Zap, Check,
  ChevronLeft, ChevronRight, Sparkles, TrendingUp, Clock, Eye, Gift,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { ProductGallery } from '@/components/storefront/pdp/ProductGallery'
import { SizeSelector } from '@/components/storefront/pdp/SizeSelector'
import { ColorSelector } from '@/components/storefront/pdp/ColorSelector'
import { ReviewsSection } from '@/components/storefront/pdp/ReviewsSection'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { ClayProductCard } from '@/components/ui/ClayProductCard'
import { DeliveryEstimate } from '@/components/storefront/pdp/DeliveryEstimate'
import { ProductDetailSkeleton } from '@/components/ui/SkeletonLoaders'
import { ClayButton } from '@/components/ui/ClayButton'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { useWishlist } from '@/hooks/useWishlist'
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

  const galleryImages = (product.media?.map((m: any) => m.url) || product.images || []).filter(Boolean)

  // Render product info panel (called as function, NOT as a component, to avoid remount)
  const renderProductInfo = (isMobile = false) => (
    <div className={isMobile ? 'px-4 pb-32 space-y-4' : 'space-y-5'}>
      {/* Brand + Name + Badges */}
      <div className="space-y-1.5">
        {product.brand && (
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-clay-text-muted">{product.brand}</p>
        )}
        <h1 className={`font-display font-bold text-clay-text leading-tight ${isMobile ? 'text-xl' : 'text-2xl lg:text-[28px]'}`}>
          {product.name}
        </h1>
        <div className="flex items-center flex-wrap gap-1.5">
          {discountPercent > 0 && <ClayBadge variant="sale" size="sm">{discountPercent}% OFF</ClayBadge>}
          {product.isNew && <ClayBadge variant="new" size="sm">NEW</ClayBadge>}
          {totalInStock <= 5 && totalInStock > 0 && <ClayBadge variant="trending" size="sm">Only {totalInStock} left</ClayBadge>}
        </div>
      </div>

      {/* Rating */}
      {(product.averageRating > 0 || product.reviewCount > 0) && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={13} className={s <= Math.round(product.averageRating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
            ))}
          </div>
          <span className="text-sm font-semibold text-clay-text">{product.averageRating?.toFixed(1)}</span>
          <span className="text-xs text-clay-text-muted">({product.reviewCount} reviews)</span>
        </div>
      )}

      {/* Price row */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={`font-bold text-clay-text ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
          ₹{((product.salePrice ?? product.basePrice) + (selectedVariant?.priceDelta || 0)).toLocaleString('en-IN')}
        </span>
        {hasDiscount && (
          <>
            <span className="text-base text-clay-text-muted line-through">
              ₹{(Number(product.basePrice) + (selectedVariant?.priceDelta || 0)).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Save ₹{(Number(product.basePrice) - Number(product.salePrice)).toLocaleString('en-IN')}
            </span>
          </>
        )}
      </div>

      {product.shortDescription && (
        <p className="text-sm text-clay-text-secondary leading-relaxed">{product.shortDescription}</p>
      )}

      <div className="h-px bg-clay-divider" />

      {/* Color */}
      {uniqueColors.length > 0 && (
        <ColorSelector
          colors={uniqueColors.map((c: string) => {
            const v = product.variants.find((vv: any) => vv.color === c)
            return { name: c, hex: v?.colorHex }
          })}
          selected={selectedColor}
          onSelect={setSelectedColor}
        />
      )}

      {/* Size */}
      {sizesForColor.length > 0 && (
        <SizeSelector sizes={sizesForColor} selected={selectedSize} onSelect={setSelectedSize} />
      )}

      {/* Stock status */}
      <AnimatePresence mode="wait">
        {selectedVariant && (
          <motion.div
            key={selectedVariantId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1.5"
          >
            <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-500' : selectedVariant.availableQty <= 5 ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            <span className={`text-xs font-semibold ${isOutOfStock ? 'text-red-600' : selectedVariant.availableQty <= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {isOutOfStock ? 'Out of Stock' : selectedVariant.availableQty <= 5 ? `Only ${selectedVariant.availableQty} left` : 'In Stock'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivery estimate */}
      <DeliveryEstimate variantId={selectedVariantId} />

      {/* Qty + CTA */}
      <div ref={ctaRef} className="space-y-2.5">
        {/* Qty row */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-clay-text-muted uppercase tracking-wide">Qty</span>
          <div className="flex items-center rounded-xl border border-clay-border overflow-hidden">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}
              className="w-9 h-9 flex items-center justify-center text-clay-text-muted hover:text-clay-text disabled:opacity-30 transition-colors hover:bg-clay-bg-sunken">
              <Minus size={13} />
            </button>
            <span className="w-9 text-center text-sm font-bold text-clay-text">{quantity}</span>
            <button onClick={() => setQuantity(q => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty}
              className="w-9 h-9 flex items-center justify-center text-clay-text-muted hover:text-clay-text disabled:opacity-30 transition-colors hover:bg-clay-bg-sunken">
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Add to Cart + Wishlist */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            disabled={!selectedVariantId || isOutOfStock || adding}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity"
            style={{
              background: isOutOfStock ? '#9ca3af' : 'linear-gradient(135deg, #d6336c 0%, #9333ea 100%)',
              boxShadow: isOutOfStock ? 'none' : '0 4px 18px rgba(214,51,108,0.30)',
            }}
          >
            {adding
              ? <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Adding…</>
              : <><ShoppingBag size={16} />{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</>
            }
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleWishlist}
            disabled={wishlistLoading}
            className="w-12 h-12 rounded-xl border border-clay-border flex items-center justify-center hover:border-rose-400 hover:bg-rose-50 transition-all"
          >
            <Heart size={18} className={isWishlisted(product.id) ? 'fill-rose-500 text-rose-500' : 'text-clay-text-muted'} />
          </motion.button>
        </div>

        {/* Buy Now */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleBuyNow}
          disabled={!selectedVariantId || isOutOfStock}
          className="w-full h-11 rounded-xl border-2 border-clay-border text-sm font-bold text-clay-text flex items-center justify-center gap-2 hover:border-clay-text transition-colors disabled:opacity-40"
        >
          <Zap size={15} /> Buy Now
        </motion.button>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { icon: Truck, label: 'Free Shipping', sub: '₹999+' },
          { icon: ShieldCheck, label: '100% Genuine', sub: 'Verified' },
          { icon: RotateCcw, label: 'Easy Returns', sub: '7 days' },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center text-center p-2.5 bg-clay-bg-sunken rounded-xl border border-clay-border-light">
            <Icon size={16} className="text-emerald-600 mb-1" />
            <p className="text-[10px] font-bold text-clay-text leading-tight">{label}</p>
            <p className="text-[9px] text-clay-text-muted mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="h-px bg-clay-divider" />

      {/* Accordion */}
      <div className="space-y-0">
        {[
          { key: 'details', label: 'Product Details', content: (
            <div className="pb-4 text-sm text-clay-text-secondary leading-relaxed prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: product.description ?? '<p>No description available.</p>' }} />
          )},
          { key: 'shipping', label: 'Shipping & Returns', content: (
            <div className="pb-4 text-sm text-clay-text-secondary space-y-1.5">
              <p>Free standard shipping on orders above ₹999.</p>
              <p>Express delivery available for select pincodes.</p>
              <p>Easy 7-day returns. Items must be unused with tags attached.</p>
            </div>
          )},
        ].map(({ key, label, content }) => (
          <div key={key} className="border-b border-clay-divider">
            <button onClick={() => toggleAccordion(key)}
              className="w-full flex items-center justify-between py-3.5 text-sm font-semibold text-clay-text">
              {label}
              <ChevronDown size={15} className={`transition-transform duration-200 ${openAccordion === key ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {openAccordion === key && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {content}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Share */}
      <button onClick={handleShare}
        className="flex items-center gap-2 text-sm text-clay-text-muted hover:text-clay-text transition-colors">
        {copied ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} />}
        <span>{copied ? 'Link copied!' : 'Share this product'}</span>
      </button>

      {/* ── Recommendations ── */}
      <RecoRow title="Top Matches for You" icon={Sparkles} items={recos?.topMatches} color="#7c3aed" />
      <RecoRow title="People Also Buy" icon={TrendingUp} items={recos?.peopleAlsoBuy} color="#d6336c" />
      <RecoRow title="Just Because You Saw This" icon={Eye} items={recos?.justBecauseYouSaw} color="#0ea5e9" />
      <RecoRow title="Your Personalised Picks" icon={Gift} items={recos?.personalised} color="#f59e0b" />

      {/* Recently Viewed */}
      {recentlyViewedIds.length > 1 && (() => {
        let rvItems: any[] = []
        try {
          const raw = localStorage.getItem('aprdite-recently-viewed')
          const list: any[] = raw ? JSON.parse(raw) : []
          rvItems = recentlyViewedIds.filter(id => id !== product.id).slice(0, 8)
            .map(id => list.find(i => i.id === id)).filter(Boolean)
        } catch { /* ignore */ }
        if (!rvItems.length) return null
        return (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><Clock size={14} className="text-emerald-600" /></div>
              <h2 className="font-bold text-sm text-clay-text">Recently Viewed</h2>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
              {rvItems.map((item: any) => (
                <Link key={item.id} href={`/product/${item.slug}`} className="flex-shrink-0 w-[120px] snap-start group">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-clay-bg-sunken relative mb-1.5">
                    {item.image
                      ? <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="120px" />
                      : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={20} className="text-clay-text-muted" /></div>
                    }
                  </div>
                  <p className="text-[11px] font-medium text-clay-text truncate leading-tight">{item.name}</p>
                  <p className="text-[11px] font-bold text-rose-500 mt-0.5">₹{(item.salePrice ?? item.price).toLocaleString('en-IN')}</p>
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Reviews */}
      <div className="mt-6">
        <ReviewsSection
          productId={product.id}
          initialReviews={product.reviews || []}
          ratingDistribution={product.ratingDistribution || []}
          averageRating={product.averageRating || 0}
          reviewCount={product.reviewCount || 0}
        />
      </div>
    </div>
  )

  return (
    <StorefrontShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ═══════════════════════════════════════
          MOBILE LAYOUT — app-style full bleed
          ═══════════════════════════════════════ */}
      <div className="md:hidden -mx-4 -mt-2">
        {/* Full-bleed gallery section */}
        <div className="relative">
          {/* Gradient overlay for header icons */}
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)', height: 80 }}
          />
          {/* Header icons over gallery */}
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ChevronLeft size={20} className="text-white" />
            </motion.button>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleWishlist}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Heart size={17} className={isWishlisted(product.id) ? 'fill-white text-white' : 'text-white'} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleShare}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {copied ? <Check size={17} className="text-white" /> : <Share2 size={17} className="text-white" />}
              </motion.button>
            </div>
          </div>

          {/* Gallery — full bleed */}
          <ProductGallery images={galleryImages} productId={product.id} fullBleed />
        </div>

        {/* White bottom-sheet panel — overlaps gallery bottom by 32px */}
        <div className="relative -mt-8 bg-white z-10" style={{ borderRadius: '28px 28px 0 0', boxShadow: '0 -4px 24px rgba(0,0,0,0.09)' }}>
          {/* Drag handle */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-9 h-1 bg-gray-200 rounded-full" />
          </div>
          {renderProductInfo(true)}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          DESKTOP LAYOUT — 2-column grid
          ═══════════════════════════════════════ */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-clay-text-muted mb-6">
          <Link href="/" className="hover:text-clay-text transition-colors">Home</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/category/${product.category.slug}`} className="hover:text-clay-text transition-colors">{product.category.name}</Link>
              <span>/</span>
            </>
          )}
          <span className="text-clay-text truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_440px] gap-10 lg:gap-14">
          {/* LEFT: Sticky Gallery */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ProductGallery images={galleryImages} productId={product.id} />
          </div>
          {/* RIGHT: Info */}
          {renderProductInfo()}
        </div>
      </div>

      {/* ═══════════════════════════════════════
          FLOATING ATC PILL — slides from RIGHT
          Only on mobile, shows after scrolling past CTA
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {atcVisible && (
          <motion.div
            key="atc-pill"
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
            className="fixed z-50 md:hidden"
            style={{ bottom: 80, right: 12 }}
          >
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleAddToCart}
              disabled={!selectedVariantId || isOutOfStock || adding}
              className="flex items-center gap-2 pl-4 pr-5 h-12 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
              style={{
                background: isOutOfStock ? '#9ca3af' : 'linear-gradient(135deg, #d6336c 0%, #9333ea 100%)',
                boxShadow: isOutOfStock ? 'none' : '0 6px 24px rgba(214,51,108,0.40), 0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {adding ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /><span>Adding…</span></>
              ) : (
                <><ShoppingBag size={16} /><span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span></>
              )}
            </motion.button>

            {/* Selection nudge bubble */}
            <AnimatePresence>
              {!selectedVariantId && (selectedColor || selectedSize) && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute -top-8 right-0 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap shadow-sm"
                >
                  {!selectedSize ? '← Pick a size first' : '← Pick a color first'}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </StorefrontShell>
  )
}
