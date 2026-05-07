'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { AprditeLogoIcon } from '@/components/shared/AprditeLogo'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'
import { DeliveryAddressBar } from '@/components/storefront/layout/DeliveryAddressBar'
import { HeroCarousel } from '@/components/storefront/home/HeroCarousel'
import { StoryBubbles } from '@/components/storefront/home/StoryBubbles'
import { CategoryGrid } from '@/components/storefront/home/CategoryGrid'
import { FlashSaleStrip } from '@/components/storefront/home/FlashSaleStrip'
import { NewArrivalsRow } from '@/components/storefront/home/NewArrivalsRow'
import { GalleryCollage } from '@/components/storefront/home/GalleryCollage'
import { HomepageSkeleton } from '@/components/ui/SkeletonLoaders'
import { ArrowRight } from 'lucide-react'
import { useSizePreference } from '@/hooks/useSizePreference'

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  }).then(r => r.data)

// RULE: Every section renders only if its type is in sections[] AND isVisible=true
// RULE: Sections render in sortOrder order — do not hardcode order

export default function HomePage() {
  const { data, isLoading, error } = useSWR('/api/storefront/homepage', fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
  })

  // Sentinel ref: a zero-height div placed right before the sticky bar
  const sentinelRef = useRef<HTMLDivElement>(null)
  const catRef = useRef<HTMLDivElement>(null)
  const catWrapRef = useRef<HTMLDivElement>(null)
  const [isCatPinned, setIsCatPinned] = useState(false)
  const pinnedLock = useRef(false) // prevents oscillation

  // IntersectionObserver to detect exact moment the sticky bar pins
  // rootMargin top = -(header 52px + delivery 40px) = -92px
  // When sentinel scrolls above that line, the bar is stuck
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldPin = !entry.isIntersecting
        if (shouldPin === pinnedLock.current) return // no change
        pinnedLock.current = shouldPin
        // Lock the wrapper height before shrinking to prevent flow shift
        if (shouldPin && catWrapRef.current) {
          catWrapRef.current.style.minHeight = catWrapRef.current.offsetHeight + 'px'
        }
        setIsCatPinned(shouldPin)
        // Release height lock after expanding back
        if (!shouldPin && catWrapRef.current) {
          setTimeout(() => {
            if (catWrapRef.current) catWrapRef.current.style.minHeight = ''
          }, 450)
        }
      },
      { threshold: 0, rootMargin: '-92px 0px 0px 0px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [data])

  // Hero fade — estimate based on sentinel position
  const { scrollY } = useScroll()
  const [fadeEnd, setFadeEnd] = useState(600)
  useEffect(() => {
    const el = sentinelRef.current
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY
      setFadeEnd(Math.max(top - 92, 200))
    }
  }, [data])
  const fadeOpacity = useTransform(scrollY, [0, fadeEnd * 0.9], [1, 0])

  const { preferredSize } = useSizePreference()

  // Helper: filter products by preferred size (if set)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterBySize = useCallback((products: any[]): any[] => {
    if (!preferredSize || !products) return products
    return products.filter((p: { availableSizes?: string[] }) => !p.availableSizes?.length || p.availableSizes.includes(preferredSize))
  }, [preferredSize])

  if (isLoading) {
    return (
      <StorefrontShell>
        <HomepageSkeleton />
      </StorefrontShell>
    )
  }

  if (error || !data) {
    return (
      <StorefrontShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
          <AprditeLogoIcon size={64} className="mb-4" />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-clay-text mb-3">Aprdite</h1>
          <p className="text-clay-text-muted text-lg mb-6">Curated fashion for the modern soul</p>
          <p className="text-sm text-clay-text-muted/60 mb-4">
            {error ? 'Unable to load homepage. Please refresh.' : 'Setting up your experience...'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-clay-rose text-white text-sm font-medium hover:bg-clay-rose-dark transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </StorefrontShell>
    )
  }

  // Sort sections by sortOrder and filter visible ones
  const visibleSections = (data?.sections ?? [])
    .filter((s: { isVisible: boolean }) => s.isVisible)
    .sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder)

  // Split sections into: hero/story (fade zone), categories (sticky), rest (scrollable)
  const heroStoryTypes = new Set(['HERO_BANNERS', 'STORY_BANNERS'])
  const heroStorySections = visibleSections.filter((s: { type: string }) => heroStoryTypes.has(s.type))
  const categoriesSection = visibleSections.find((s: { type: string }) => s.type === 'CATEGORIES')
  const restSections = visibleSections.filter((s: { type: string }) => !heroStoryTypes.has(s.type) && s.type !== 'CATEGORIES')

  const sectionMap: Record<string, () => React.ReactNode> = {
    HERO_BANNERS: () => {
      const slides = data?.heroSlides?.length > 0 ? data.heroSlides : data?.heroBanners
      return slides?.length > 0 ? <HeroCarousel slides={slides} /> : null
    },
    STORY_BANNERS: () =>
      data?.stories?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-4 md:py-8">
          <StoryBubbles stories={data.stories} />
        </motion.section>
      ) : null,
    CATEGORIES: () => (
      <div className={isCatPinned ? 'py-0' : 'py-3 md:py-5 md:px-4 md:max-w-7xl md:mx-auto'} style={{ transition: 'padding 0.3s cubic-bezier(0.32,0.72,0,1)' }}>
        <CategoryGrid isCompact={isCatPinned} />
      </div>
    ),
    FLASH_SALE: () =>
      data?.flashSale ? (
        <motion.section variants={fadeUpVariants} className="py-4 md:py-8">
          <FlashSaleStrip flashSale={data.flashSale} />
        </motion.section>
      ) : null,
    NEW_ARRIVALS: () =>
      data?.newArrivals?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10 px-4 max-w-7xl mx-auto">
          <SectionHeader title="New Arrivals" />
          <NewArrivalsRow products={filterBySize(data.newArrivals)} />
        </motion.section>
      ) : null,
    FEATURED_PRODUCTS: () =>
      data?.featuredProducts?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10 px-4 max-w-7xl mx-auto">
          <SectionHeader title="Curated for You" />
          <NewArrivalsRow products={filterBySize(data.featuredProducts)} />
        </motion.section>
      ) : null,
    TRENDING: () =>
      data?.trendingProducts?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10 px-4 max-w-7xl mx-auto">
          <SectionHeader title="Trending Now" />
          <NewArrivalsRow products={filterBySize(data.trendingProducts)} />
        </motion.section>
      ) : null,
    PROMO_CARDS: () =>
      data?.promoCards?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10">
          <div className="px-4 md:px-0 md:max-w-7xl md:mx-auto"><SectionHeader title="Special Offers" /></div>
          <div className="flex gap-4 overflow-x-auto app-scroll-x pb-2 px-4 md:px-0 md:max-w-7xl md:mx-auto md:grid md:grid-cols-2 md:overflow-visible">
            {data.promoCards.map((promo: { id: string; name: string; description?: string; type: string; config: Record<string, unknown> }) => {
              const bannerImg = promo.config?.bannerImage as string | undefined
              const gradients: Record<string, string> = {
                BUNDLE_DEAL: 'from-purple-600 via-purple-500 to-indigo-600',
                FREE_SHIPPING: 'from-emerald-600 via-teal-500 to-cyan-600',
                PERCENTAGE: 'from-rose-600 via-pink-500 to-fuchsia-600',
                FLAT_AMOUNT: 'from-amber-600 via-orange-500 to-red-500',
                BOGO: 'from-blue-600 via-indigo-500 to-violet-600',
              }
              const gradient = gradients[promo.type] || 'from-clay-rose via-clay-rose-light to-pink-400'
              return (
                <motion.div key={promo.id} whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.2 }} className="flex-shrink-0 w-[85vw] md:w-auto">
                  <Link href={promo.config?.linkUrl as string ?? '/search'} className="block">
                    <div
                      className={`relative overflow-hidden rounded-2xl h-[160px] md:h-[180px] bg-gradient-to-br ${gradient}`}
                      style={{
                        boxShadow: '0 8px 24px -4px rgba(0,0,0,0.15), 0 4px 8px -2px rgba(0,0,0,0.08)',
                      }}
                    >
                      {/* Banner image if available */}
                      {bannerImg && (
                        <img src={bannerImg} alt={promo.name} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />
                      )}
                      {/* Content */}
                      <div className="relative z-10 h-full flex flex-col justify-between p-5 md:p-6">
                        <div>
                          <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-white/90 mb-2">
                            {promo.type === 'BUNDLE_DEAL' ? 'Bundle' : promo.type === 'FREE_SHIPPING' ? 'Free Shipping' : 'Limited Offer'}
                          </span>
                          <h3 className="font-display text-lg md:text-xl font-bold text-white leading-tight">{promo.name}</h3>
                          {promo.description && (
                            <p className="text-xs md:text-sm text-white/80 mt-1 line-clamp-2">{promo.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white hover:bg-white/30 transition-colors">
                            Shop Now <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                      {/* Decorative circles */}
                      <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.section>
      ) : null,
    COLLECTIONS: () =>
      data?.collections?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10 px-4 max-w-7xl mx-auto">
          <SectionHeader title="Shop Collections" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.collections.map((c: { id: string; name: string; slug: string; bannerUrl?: string; bannerThumbnail?: string }) => (
              <Link key={c.id} href={`/collections/${c.slug}`}>
                <motion.div whileHover={{ y: -4 }} className="rounded-2xl overflow-hidden relative group cursor-pointer aspect-[3/4]">
                  {(c.bannerUrl || c.bannerThumbnail) ? (
                    <img src={c.bannerThumbnail ?? c.bannerUrl!} alt={c.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-clay-surface flex items-center justify-center">
                      <span className="text-4xl">🗂️</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <span className="font-display font-bold text-white text-sm md:text-base">{c.name}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>
      ) : null,
    TOP_PICKS: () =>
      data?.trendingProducts?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10 px-4 max-w-7xl mx-auto">
          <SectionHeader title="Top Picks" />
          <NewArrivalsRow products={filterBySize(data.trendingProducts).slice(0, 6)} />
        </motion.section>
      ) : null,
    FOR_YOU: () =>
      data?.featuredProducts?.length > 0 || data?.trendingProducts?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10 px-4 max-w-7xl mx-auto">
          <SectionHeader title="Picked for You" />
          <NewArrivalsRow products={filterBySize(data.featuredProducts?.length > 0 ? data.featuredProducts : data.trendingProducts)} />
        </motion.section>
      ) : null,
    GALLERY: () =>
      data?.gallery?.length > 0 ? (
        <motion.section variants={fadeUpVariants} className="py-5 md:py-10">
          <GalleryCollage items={data.gallery} />
        </motion.section>
      ) : null,
  }

  return (
    <StorefrontShell>
      {/* Delivery bar — homepage only, fixed below header */}
      <div className="fixed top-[52px] md:top-[72px] left-0 right-0 z-40">
        <DeliveryAddressBar />
      </div>
      <div className="min-h-screen">
        {/* ── Fade zone: Hero + Story — fades out as you scroll, fully gone when categories near the top ── */}
        <motion.div style={{ opacity: fadeOpacity }}>
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            {heroStorySections.map((section: { type: string }) => {
              const renderer = sectionMap[section.type]
              if (!renderer) return null
              return <div key={section.type}>{renderer()}</div>
            })}
          </motion.div>
        </motion.div>

        {/* ── Sentinel: triggers compact mode exactly when it crosses behind header+delivery bar ── */}
        {categoriesSection && <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />}

        {/* ── Sticky Categories — pins below header+delivery on scroll ── */}
        {categoriesSection && (
          <div ref={catWrapRef}>
            <div
              ref={catRef}
              className="sticky z-30"
              style={{
                top: 'calc(52px + 40px - 2px)',
                contain: 'layout style',
                isolation: 'isolate',
              }}
            >
              <div
                className="bg-clay-bg-elevated border-b border-clay-border-light overflow-hidden"
                style={{
                  boxShadow: isCatPinned ? '0 4px 12px rgba(0,0,0,0.06)' : '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                {sectionMap.CATEGORIES()}
              </div>
            </div>
          </div>
        )}

        {/* ── Rest of content scrolls normally below the sticky category bar ── */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          {restSections.map((section: { type: string }) => {
            const renderer = sectionMap[section.type]
            if (!renderer) return null
            return <div key={section.type}>{renderer()}</div>
          })}
        </motion.div>
      </div>
    </StorefrontShell>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <motion.h2
      className="font-display text-lg md:text-3xl font-bold text-clay-text mb-4 md:mb-6"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      {title}
    </motion.h2>
  )
}
