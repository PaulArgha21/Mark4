import { PrismaClient, BannerType } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding homepage components...')

  // Seed Hero Banners
  const heroBanners = await Promise.all([
    db.heroBanner.upsert({
      where: { id: 'hero-1' },
      update: {},
      create: {
        id: 'hero-1',
        title: 'Summer Collection 2026',
        subtitle: 'Discover the latest trends in fashion',
        bannerType: BannerType.IMAGE,
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80',
        linkUrl: '/collections/summer',
        isActive: true,
        sortOrder: 1,
      },
    }),
    db.heroBanner.upsert({
      where: { id: 'hero-2' },
      update: {},
      create: {
        id: 'hero-2',
        title: 'Ethnic Elegance',
        subtitle: 'Traditional crafts, modern style',
        bannerType: BannerType.IMAGE,
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=1920&q=80',
        linkUrl: '/collections/ethnic',
        isActive: true,
        sortOrder: 2,
      },
    }),
    db.heroBanner.upsert({
      where: { id: 'hero-3' },
      update: {},
      create: {
        id: 'hero-3',
        title: 'Flash Sale',
        subtitle: 'Up to 50% off on selected items',
        bannerType: BannerType.IMAGE,
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1920&q=80',
        linkUrl: '/offers/flash-sales',
        isActive: true,
        sortOrder: 3,
      },
    }),
  ])
  console.log(`  ✓ Created ${heroBanners.length} hero banners`)

  // Seed Story Banners (Instagram-style stories)
  const storyBanners = await Promise.all([
    db.storyBanner.upsert({
      where: { id: 'story-1' },
      update: {},
      create: {
        id: 'story-1',
        title: 'New Arrivals',
        imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80',
        linkUrl: '/collections/new-arrivals',
        isActive: true,
        sortOrder: 1,
      },
    }),
    db.storyBanner.upsert({
      where: { id: 'story-2' },
      update: {},
      create: {
        id: 'story-2',
        title: 'Summer Sale',
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80',
        linkUrl: '/offers',
        isActive: true,
        sortOrder: 2,
      },
    }),
    db.storyBanner.upsert({
      where: { id: 'story-3' },
      update: {},
      create: {
        id: 'story-3',
        title: 'Ethnic Wear',
        imageUrl: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&q=80',
        linkUrl: '/category/ethnic-wear',
        isActive: true,
        sortOrder: 3,
      },
    }),
    db.storyBanner.upsert({
      where: { id: 'story-4' },
      update: {},
      create: {
        id: 'story-4',
        title: 'Dresses',
        imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
        linkUrl: '/category/dresses',
        isActive: true,
        sortOrder: 4,
      },
    }),
    db.storyBanner.upsert({
      where: { id: 'story-5' },
      update: {},
      create: {
        id: 'story-5',
        title: 'Tops',
        imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80',
        linkUrl: '/category/tops',
        isActive: true,
        sortOrder: 5,
      },
    }),
  ])
  console.log(`  ✓ Created ${storyBanners.length} story banners`)

  // Seed Gallery Items
  const galleryItems = await Promise.all([
    db.galleryItem.upsert({
      where: { id: 'gallery-1' },
      update: {},
      create: {
        id: 'gallery-1',
        imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
        caption: 'Summer vibes',
        linkUrl: '/product/floral-maxi-dress',
        sizeClass: 'large',
        isActive: true,
        sortOrder: 1,
      },
    }),
    db.galleryItem.upsert({
      where: { id: 'gallery-2' },
      update: {},
      create: {
        id: 'gallery-2',
        imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
        caption: 'Elegant styles',
        linkUrl: '/collections/dresses',
        sizeClass: 'medium',
        isActive: true,
        sortOrder: 2,
      },
    }),
    db.galleryItem.upsert({
      where: { id: 'gallery-3' },
      update: {},
      create: {
        id: 'gallery-3',
        imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&q=80',
        caption: 'Ethnic beauty',
        linkUrl: '/category/ethnic-wear',
        sizeClass: 'tall',
        isActive: true,
        sortOrder: 3,
      },
    }),
    db.galleryItem.upsert({
      where: { id: 'gallery-4' },
      update: {},
      create: {
        id: 'gallery-4',
        imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
        caption: 'Casual comfort',
        linkUrl: '/category/tops',
        sizeClass: 'medium',
        isActive: true,
        sortOrder: 4,
      },
    }),
    db.galleryItem.upsert({
      where: { id: 'gallery-5' },
      update: {},
      create: {
        id: 'gallery-5',
        imageUrl: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=800&q=80',
        caption: 'Modern trends',
        linkUrl: '/collections/new-arrivals',
        sizeClass: 'wide',
        isActive: true,
        sortOrder: 5,
      },
    }),
    db.galleryItem.upsert({
      where: { id: 'gallery-6' },
      update: {},
      create: {
        id: 'gallery-6',
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
        caption: 'Party ready',
        linkUrl: '/collections/party',
        sizeClass: 'medium',
        isActive: true,
        sortOrder: 6,
      },
    }),
  ])
  console.log(`  ✓ Created ${galleryItems.length} gallery items`)

  // Seed Promotions
  const promotions = await Promise.all([
    db.promotion.upsert({
      where: { id: 'promo-1' },
      update: {},
      create: {
        id: 'promo-1',
        name: 'Summer Sale 2026',
        description: 'Get up to 50% off on summer collection',
        type: 'SPEND_X_SAVE_Y',
        config: {
          discountType: 'PERCENTAGE',
          discountValue: 50,
          imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80',
          linkUrl: '/offers/summer-sale',
        },
        isActive: true,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    }),
    db.promotion.upsert({
      where: { id: 'promo-2' },
      update: {},
      create: {
        id: 'promo-2',
        name: 'First Order Discount',
        description: '15% off on your first order',
        type: 'SPEND_X_SAVE_Y',
        config: {
          discountType: 'PERCENTAGE',
          discountValue: 15,
          imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
          linkUrl: '/register',
        },
        isActive: true,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    }),
  ])
  console.log(`  ✓ Created ${promotions.length} promotions`)

  // Update HomepageSection configs
  const heroSection = await db.homepageSection.upsert({
    where: { type: 'HERO_BANNERS' },
    update: {
      config: {
        autoPlay: true,
        interval: 5000,
        showDots: true,
        showArrows: true,
      },
    },
    create: {
      type: 'HERO_BANNERS',
      isVisible: true,
      sortOrder: 0,
      config: {
        autoPlay: true,
        interval: 5000,
        showDots: true,
        showArrows: true,
      },
    },
  })

  const storySection = await db.homepageSection.upsert({
    where: { type: 'STORY_BANNERS' },
    update: {
      config: {
        autoPlay: false,
        showLabels: true,
      },
    },
    create: {
      type: 'STORY_BANNERS',
      isVisible: true,
      sortOrder: 1,
      config: {
        autoPlay: false,
        showLabels: true,
      },
    },
  })

  const gallerySection = await db.homepageSection.upsert({
    where: { type: 'GALLERY' },
    update: {
      config: {
        layout: 'masonry',
        columns: 3,
      },
    },
    create: {
      type: 'GALLERY',
      isVisible: true,
      sortOrder: 8,
      config: {
        layout: 'masonry',
        columns: 3,
      },
    },
  })

  console.log('  ✓ Updated homepage section configs')

  console.log('✅ Homepage seeding complete!')
}

main().catch(console.error).finally(() => db.$disconnect())
