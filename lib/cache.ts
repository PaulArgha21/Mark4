import { redis } from './redis'

// ── CACHE KEYS ───────────────────────────────────────────────────
export const CACHE_KEYS = {
  homepage:          'homepage:v2:config',
  homepageSections:  'homepage:sections:ordered',
  heroSlides:        'homepage:hero:slides',
  storyBanners:      'homepage:stories:list',
  flashSaleStrip:    'homepage:flash-sale:active',
  featuredProducts:  'homepage:products:featured',
  siteSettings:      'settings:site:v1',
  navigation:        'nav:categories:tree',
  announcementBar:   'cms:announcement:active',
  blogList:          'blog:posts:published',
  activeCoupons:     'coupons:active:list',
  category: (slug: string)      => `plp:category:${slug}`,
  collection: (slug: string)    => `collection:${slug}:data`,
  product: (slug: string)       => `pdp:${slug}:full`,
  productStock: (sku: string)   => `stock:${sku}`,
  blogPost: (slug: string)      => `blog:post:${slug}`,
  flashSale: (slug: string)     => `flash-sale:${slug}:data`,
} as const

// ── INVALIDATION ─────────────────────────────────────────────────
interface CacheInvalidation {
  key: string
  revalidatePaths?: string[]
  broadcastEvent?: string
  payload?: Record<string, unknown>
}

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function invalidateCmsCache(changes: CacheInvalidation[]): Promise<void> {
  const pipeline = redis.pipeline()
  for (const change of changes) {
    pipeline.del(change.key)
  }
  await pipeline.exec()

  // ISR revalidation
  for (const change of changes) {
    if (change.revalidatePaths) {
      for (const path of change.revalidatePaths) {
        fetch(`${APP_URL}/api/revalidate?path=${encodeURIComponent(path)}&secret=${REVALIDATE_SECRET}`)
          .catch(console.error)
      }
    }
    // SSE broadcast
    if (change.broadcastEvent) {
      redis.publish('cms:live-updates', JSON.stringify({
        event: change.broadcastEvent,
        data: change.payload ?? {}
      })).catch(console.error)
    }
  }
}
