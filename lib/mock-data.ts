// ═══════════════════════════════════════════════════════════
// MOCK DATA — Development Only
// In production, all data comes from Prisma DB + Redis cache
// ═══════════════════════════════════════════════════════════

export const mockSiteSettings = {
  siteName: 'Aprdite',
  tagline: 'Curated Fashion for the Modern Soul',
  announcementText: 'FREE SHIPPING on orders above ₹999 — Use code WELCOME15 for 15% off',
  announcementLink: '/category/sale',
  primaryColor: '#d6336c',
  metaTitle: 'Aprdite — Premium Fashion Store',
  metaDescription: 'Discover curated collections of premium fashion, designed for the modern you.',
  contactEmail: 'support@aprdite.com',
  contactPhone: '+91-XXX-XXX-XXXX',
}

export const mockCategories = [
  { id: 'cat-1', name: 'Women', slug: 'women', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=500&fit=crop', productCount: 248 },
  { id: 'cat-2', name: 'Men', slug: 'men', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop', productCount: 186 },
  { id: 'cat-3', name: 'Accessories', slug: 'accessories', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=500&fit=crop', productCount: 124 },
  { id: 'cat-4', name: 'Footwear', slug: 'footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop', productCount: 89 },
  { id: 'cat-5', name: 'Ethnic Wear', slug: 'ethnic-wear', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=400&h=500&fit=crop', productCount: 156 },
  { id: 'cat-6', name: 'Western Wear', slug: 'western-wear', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop', productCount: 203 },
  { id: 'cat-7', name: 'Activewear', slug: 'activewear', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=500&fit=crop', productCount: 67 },
  { id: 'cat-8', name: 'Kids', slug: 'kids', image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&h=500&fit=crop', productCount: 142 },
]

export const mockHeroSlides = [
  {
    id: 'hero-1',
    title: 'Summer Collection 2024',
    subtitle: 'Light fabrics, bold statements',
    ctaText: 'Shop Now',
    ctaLink: '/category/summer-collection',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&h=1080&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1200&fit=crop',
    overlayColor: 'rgba(0,0,0,0.3)',
  },
  {
    id: 'hero-2',
    title: 'Ethnic Elegance',
    subtitle: 'Handcrafted pieces for every celebration',
    ctaText: 'Explore',
    ctaLink: '/category/ethnic-wear',
    imageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1920&h=1080&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&h=1200&fit=crop',
    overlayColor: 'rgba(0,0,0,0.35)',
  },
  {
    id: 'hero-3',
    title: 'Flat 40% Off',
    subtitle: 'On premium brands this weekend only',
    ctaText: 'Grab the Deal',
    ctaLink: '/category/sale',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
    mobileImageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=1200&fit=crop',
    overlayColor: 'rgba(0,0,0,0.4)',
  },
]

export const mockStories = [
  { id: 'story-1', title: 'New In', thumbnailUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop', linkUrl: '/category/new-arrivals', gradientStart: '#d6336c', gradientEnd: '#f06595' },
  { id: 'story-2', title: 'Trending', thumbnailUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=200&h=200&fit=crop', linkUrl: '/category/trending', gradientStart: '#f5c542', gradientEnd: '#fcc419' },
  { id: 'story-3', title: 'Sale', thumbnailUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=200&h=200&fit=crop', linkUrl: '/category/sale', gradientStart: '#e03131', gradientEnd: '#ff6b6b' },
  { id: 'story-4', title: 'Ethnic', thumbnailUrl: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=200&h=200&fit=crop', linkUrl: '/category/ethnic-wear', gradientStart: '#2f9e44', gradientEnd: '#40c057' },
  { id: 'story-5', title: 'Casual', thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop', linkUrl: '/category/casual', gradientStart: '#339af0', gradientEnd: '#74c0fc' },
  { id: 'story-6', title: 'Luxury', thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=200&h=200&fit=crop', linkUrl: '/category/luxury', gradientStart: '#7950f2', gradientEnd: '#9775fa' },
]

export const mockProducts = [
  {
    id: 'prod-1', slug: 'silk-blend-maxi-dress', name: 'Silk Blend Maxi Dress', brand: 'ARIA',
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=800&fit=crop'],
    basePrice: 4999, salePrice: 2999, averageRating: 4.5, reviewCount: 128,
    availableSizes: ['XS', 'S', 'M', 'L', 'XL'], colors: [{ name: 'Dusty Rose', hex: '#d6336c' }, { name: 'Ivory', hex: '#f8f9fa' }, { name: 'Sage', hex: '#8fbc8f' }],
    discountPercent: 40, trendingScore: 85, isNew: false,
  },
  {
    id: 'prod-2', slug: 'cotton-linen-shirt', name: 'Cotton Linen Relaxed Fit Shirt', brand: 'CLOVE',
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1598032895397-b9472444bf93?w=600&h=800&fit=crop'],
    basePrice: 2499, salePrice: null, averageRating: 4.2, reviewCount: 56,
    availableSizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'White', hex: '#ffffff' }, { name: 'Sky Blue', hex: '#339af0' }],
    discountPercent: 0, trendingScore: 62, isNew: true,
  },
  {
    id: 'prod-3', slug: 'embroidered-kurta-set', name: 'Hand Embroidered Kurta Set', brand: 'VEDA',
    images: ['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=800&fit=crop'],
    basePrice: 6999, salePrice: 4899, averageRating: 4.8, reviewCount: 234,
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: [{ name: 'Maroon', hex: '#800020' }, { name: 'Navy', hex: '#1a1b4b' }, { name: 'Emerald', hex: '#2f9e44' }],
    discountPercent: 30, trendingScore: 92, isNew: false,
  },
  {
    id: 'prod-4', slug: 'sneaker-comfort-run', name: 'ComfortRun Daily Sneakers', brand: 'STRIDE',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop'],
    basePrice: 3499, salePrice: 2449, averageRating: 4.3, reviewCount: 189,
    availableSizes: ['6', '7', '8', '9', '10', '11'], colors: [{ name: 'Red', hex: '#e03131' }, { name: 'Black', hex: '#1a1b1e' }, { name: 'White', hex: '#ffffff' }],
    discountPercent: 30, trendingScore: 78, isNew: false,
  },
  {
    id: 'prod-5', slug: 'leather-crossbody-bag', name: 'Italian Leather Crossbody', brand: 'LUXE',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=800&fit=crop'],
    basePrice: 7999, salePrice: null, averageRating: 4.7, reviewCount: 92,
    availableSizes: [], colors: [{ name: 'Tan', hex: '#d2b48c' }, { name: 'Black', hex: '#1a1b1e' }],
    discountPercent: 0, trendingScore: 55, isNew: true,
  },
  {
    id: 'prod-6', slug: 'flowy-palazzo-pants', name: 'High-Waist Flowy Palazzo', brand: 'ARIA',
    images: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=800&fit=crop'],
    basePrice: 1899, salePrice: 1299, averageRating: 4.1, reviewCount: 67,
    availableSizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Beige', hex: '#f5f5dc' }, { name: 'Olive', hex: '#6b8e23' }, { name: 'Black', hex: '#1a1b1e' }],
    discountPercent: 32, trendingScore: 48, isNew: false,
  },
  {
    id: 'prod-7', slug: 'statement-earrings-gold', name: 'Hammered Gold Statement Earrings', brand: 'LUMIERE',
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&h=800&fit=crop'],
    basePrice: 1499, salePrice: null, averageRating: 4.6, reviewCount: 143,
    availableSizes: [], colors: [{ name: 'Gold', hex: '#ffd700' }, { name: 'Silver', hex: '#c0c0c0' }],
    discountPercent: 0, trendingScore: 71, isNew: true,
  },
  {
    id: 'prod-8', slug: 'oversized-denim-jacket', name: 'Vintage Wash Oversized Denim Jacket', brand: 'REBEL',
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop', 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&h=800&fit=crop'],
    basePrice: 3999, salePrice: 2799, averageRating: 4.4, reviewCount: 98,
    availableSizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Light Wash', hex: '#87ceeb' }, { name: 'Dark Wash', hex: '#1a1b4b' }],
    discountPercent: 30, trendingScore: 83, isNew: false,
  },
]

export const mockFlashSale = {
  id: 'fs-1',
  name: 'Weekend Flash Sale',
  slug: 'weekend-flash',
  bannerImage: null,
  startDate: new Date(Date.now() - 3600000).toISOString(),
  endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
  isActive: true,
  displayCountdown: true,
  products: mockProducts.slice(0, 4).map(p => ({
    ...p,
    flashSalePrice: Math.round(p.basePrice * 0.5),
    stockLimit: 50,
    soldCount: Math.floor(Math.random() * 40),
  })),
}

export const mockGallery = [
  { id: 'gal-1', imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=600&fit=crop', caption: 'Summer Vibes', linkUrl: '/category/summer', sizeClass: 'large', isActive: true, sortOrder: 0 },
  { id: 'gal-2', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=600&fit=crop', caption: 'Elegance Redefined', linkUrl: '/category/ethnic-wear', sizeClass: 'medium', isActive: true, sortOrder: 1 },
  { id: 'gal-3', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop', caption: 'Street Style', linkUrl: '/category/western-wear', sizeClass: 'tall', isActive: true, sortOrder: 2 },
  { id: 'gal-4', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=600&fit=crop', caption: 'The Shop', linkUrl: '/collections', sizeClass: 'wide', isActive: true, sortOrder: 3 },
  { id: 'gal-5', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop', caption: 'Minimal Chic', linkUrl: '/category/minimal', sizeClass: 'medium', isActive: true, sortOrder: 4 },
  { id: 'gal-6', imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=600&fit=crop', caption: 'Active Life', linkUrl: '/category/activewear', sizeClass: 'medium', isActive: true, sortOrder: 5 },
]

export const mockHomepageSections = [
  { type: 'HERO_BANNERS',      isVisible: true, sortOrder: 0 },
  { type: 'STORY_BANNERS',     isVisible: true, sortOrder: 1 },
  { type: 'CATEGORIES',        isVisible: true, sortOrder: 2 },
  { type: 'FLASH_SALE',        isVisible: true, sortOrder: 3 },
  { type: 'NEW_ARRIVALS',      isVisible: true, sortOrder: 4 },
  { type: 'FEATURED_PRODUCTS', isVisible: true, sortOrder: 5 },
  { type: 'GALLERY',           isVisible: true, sortOrder: 6 },
]
