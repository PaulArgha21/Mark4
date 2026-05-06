export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { redis } from '@/lib/redis'
import { ok, serverError } from '@/lib/api-response'
import { CACHE_KEYS } from '@/lib/cache'

const CACHE_TTL = 60 // 60 seconds

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProduct(p: any) {
  const basePrice = Number(p.basePrice ?? 0)
  const salePrice = p.salePrice ? Number(p.salePrice) : null
  const images = (p.media ?? []).map((m: { url: string }) => m.url)
  if (images.length === 0) images.push('/placeholder.svg')
  const hasDiscount = salePrice && salePrice < basePrice
  const daysSinceCreated = p.createdAt
    ? (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 999
  const availableSizes: string[] = Array.from(new Set(
    (p.variants ?? []).filter((v: any) => v.isActive !== false && v.size).map((v: any) => v.size)
  ))
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? null,
    images,
    basePrice,
    salePrice,
    averageRating: Number(p.averageRating ?? 0),
    reviewCount: Number(p.reviewCount ?? 0),
    trendingScore: p.trendingScore?.score ? Number(p.trendingScore.score) : (p.trendingScore ? Number(p.trendingScore) : null),
    discountPercent: hasDiscount ? Math.round((1 - salePrice / basePrice) * 100) : 0,
    isNew: daysSinceCreated < 14,
    availableSizes,
  }
}

export async function GET() {
  try {
    // 1. Try Redis cache first (fail-safe — if Redis is down, skip cache)
    try {
      const cached = await redis.get(CACHE_KEYS.homepage)
      if (cached) {
        return ok(typeof cached === 'string' ? JSON.parse(cached) : cached)
      }
    } catch (cacheErr) {
      console.warn('Homepage cache read failed, falling back to DB:', cacheErr)
    }

    const now = new Date()

    // 2. Fetch all sections config
    const sections = await db.homepageSection.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: 'asc' },
    })

    // 3. Fetch hero slides (active + scheduled)
    const heroSlides = await db.homepageCollectionSlide.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        collection: { select: { name: true, slug: true } },
        products: { orderBy: { sortOrder: 'asc' } },
      },
    })

    // 4. Fetch story banners
    const stories = await db.storyBanner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    // 5. Fetch active flash sale
    const flashSale = await db.flashSale.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { priority: 'desc' },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          take: 12,
          include: {
            product: {
              select: {
                id: true, name: true, slug: true, brand: true,
                basePrice: true, salePrice: true,
                media: { where: { isPrimary: true }, take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    })

    // 6. Fetch featured products from section config
    const featuredSection = sections.find(s => s.type === 'FEATURED_PRODUCTS')
    let featuredProductsRaw: unknown[] = []
    if (featuredSection?.config) {
      const cfg = featuredSection.config as { productIds?: string[] }
      if (cfg.productIds?.length) {
        featuredProductsRaw = await db.product.findMany({
          where: { id: { in: cfg.productIds }, isActive: true },
          include: {
            media: { where: { isPrimary: true }, take: 1 },
            trendingScore: true,
            variants: { where: { isActive: true }, select: { size: true, isActive: true } },
          },
        })
      }
    }
    const featuredProducts = featuredProductsRaw.map(transformProduct)

    // 7. Fetch new arrivals
    const newArrivalsRaw = await db.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        media: { where: { isPrimary: true }, take: 1 },
        trendingScore: true,
        variants: { where: { isActive: true }, select: { size: true, isActive: true } },
      },
    })
    const newArrivals = newArrivalsRaw.map(transformProduct)

    // 8. Fetch gallery items
    const gallery = await db.galleryItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    // 9. Fetch site settings
    const siteSettings = await db.siteSetting.findFirst({
      select: {
        siteName: true, announcementText: true, announcementLink: true,
        primaryColor: true, metaTitle: true, metaDescription: true,
      },
    })

    // 10. Fetch hero banners (direct banners, not collection slides)
    const heroBanners = await db.heroBanner.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { sortOrder: 'asc' },
    })

    // 11. Trending products (from ML engine)
    const trendingProducts = await db.trendingScore.findMany({
      where: { score: { gt: 0 }, product: { isActive: true } },
      orderBy: { score: 'desc' },
      take: 10,
      include: {
        product: {
          select: {
            id: true, name: true, slug: true, brand: true,
            basePrice: true, salePrice: true,
            media: { where: { isPrimary: true }, take: 1, select: { url: true } },
            variants: { where: { isActive: true }, select: { size: true, isActive: true } },
          },
        },
      },
    })

    // 12. Active promotions (promo cards)
    const promoCards = await db.promotion.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }],
      take: 6,
    })

    // 13. Active collections
    const collections = await db.collection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: 8,
      select: {
        id: true, name: true, slug: true, description: true,
        bannerUrl: true, bannerThumbnail: true,
      },
    })

    const data = {
      sections,
      heroSlides: heroSlides.map(s => ({
        id: s.id,
        title: s.title ?? s.collection?.name ?? '',
        subtitle: s.subtitle ?? '',
        ctaText: 'View Collection',
        ctaLink: s.collection?.slug ? `/collections/${s.collection.slug}` : '/search',
        imageUrl: s.bannerUrl ?? '/placeholder.svg',
        mobileImageUrl: s.bannerUrl ?? '/placeholder.svg',
        overlayColor: 'rgba(0,0,0,0.3)',
      })),
      heroBanners: heroBanners.map(b => ({
        id: b.id,
        title: b.title ?? '',
        subtitle: b.subtitle ?? '',
        ctaText: 'Shop Now',
        ctaLink: b.linkUrl ?? '/search',
        imageUrl: b.imageUrl ?? '/placeholder.svg',
        mobileImageUrl: b.imageUrl ?? '/placeholder.svg',
        overlayColor: 'rgba(0,0,0,0.3)',
      })),
      stories: stories.map((s, i) => ({
        id: s.id,
        title: s.title ?? '',
        thumbnailUrl: s.imageUrl,
        linkUrl: s.linkUrl ?? '#',
        gradientStart: ['#d6336c', '#e8590c', '#ae3ec9', '#1098ad', '#37b24d'][i % 5],
        gradientEnd: ['#f06595', '#fd7e14', '#cc5de8', '#22b8cf', '#69db7c'][i % 5],
      })),
      flashSale: flashSale ? {
        id: flashSale.id,
        name: flashSale.name,
        slug: flashSale.slug,
        endDate: flashSale.endDate.toISOString(),
        displayCountdown: flashSale.displayCountdown,
        products: flashSale.products.map(fp => {
          const imgs = fp.product.media?.map((m: { url: string }) => m.url) ?? []
          if (imgs.length === 0) imgs.push('/placeholder.svg')
          return {
            id: fp.product.id,
            slug: fp.product.slug,
            name: fp.product.name,
            brand: fp.product.brand ?? null,
            images: imgs,
            basePrice: Number(fp.product.basePrice),
            flashSalePrice: Number(fp.salePrice),
            stockLimit: fp.stockLimit ?? 0,
            soldCount: fp.soldCount,
          }
        }),
      } : null,
      featuredProducts,
      newArrivals,
      trendingProducts: trendingProducts.map(t => {
        const prod = t.product as Record<string, unknown> & { media?: { url: string }[]; variants?: { size: string | null; isActive: boolean }[] }
        const basePrice = Number(prod.basePrice ?? 0)
        const salePrice = prod.salePrice ? Number(prod.salePrice) : null
        const images = (prod.media ?? []).map((m: { url: string }) => m.url)
        if (images.length === 0) images.push('/placeholder.svg')
        const hasDiscount = salePrice && salePrice < basePrice
        const availableSizes: string[] = Array.from(new Set(
          (prod.variants ?? []).filter(v => v.size).map(v => v.size!)
        ))
        return {
          id: prod.id,
          slug: prod.slug,
          name: prod.name,
          brand: prod.brand ?? null,
          images,
          basePrice,
          salePrice,
          averageRating: 0,
          reviewCount: 0,
          trendingScore: Number(t.score),
          discountPercent: hasDiscount ? Math.round((1 - salePrice / basePrice) * 100) : 0,
          isNew: false,
          availableSizes,
        }
      }),
      promoCards,
      collections,
      gallery,
      siteSettings,
    }

    // 10. Cache for 60 seconds (fail-safe)
    try {
      await redis.set(CACHE_KEYS.homepage, JSON.stringify(data), { ex: CACHE_TTL })
    } catch (cacheErr) {
      console.warn('Homepage cache write failed:', cacheErr)
    }

    return ok(data)
  } catch (err) {
    console.error('Homepage API error:', err)
    return serverError()
  }
}
