// ═══════════════════════════════════════════════════════════
// SHARED TYPES — Used across storefront + portal
// ═══════════════════════════════════════════════════════════

export interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  image?: string | null
  role: string
}

export interface Employee {
  id: string
  name: string
  email: string
  role: EmployeeRole
  isActive: boolean
}

export type EmployeeRole = 'SUPERADMIN' | 'ADMIN' | 'MARKETING' | 'FINANCE' | 'OPERATIONS' | 'OFFERS'

export interface ProductCard {
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

export interface ProductDetail extends ProductCard {
  description?: string | null
  category?: { id: string; name: string; slug: string }
  media: MediaAsset[]
  variants: ProductVariant[]
  reviews: Review[]
  ratingDistribution: { rating: number; count: number }[]
  sameCollectionProducts: ProductCard[]
  tags?: { name: string; slug: string }[]
}

export interface ProductVariant {
  id: string
  sku: string
  size?: string | null
  color?: string | null
  colorHex?: string | null
  priceDelta: number
  availableQty: number
  sortOrder: number
  media?: MediaAsset[]
}

export interface MediaAsset {
  id: string
  url: string
  alt?: string | null
  type: string
  isPrimary: boolean
  sortOrder: number
}

export interface Review {
  id: string
  rating: number
  title?: string | null
  body?: string | null
  images?: string[]
  createdAt: string
  user: { name: string; image?: string | null }
}

export interface CartData {
  items: CartItem[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  coupon?: { code: string; discountAmount: number } | null
}

export interface CartItem {
  id: string
  variantId: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    brand?: string | null
    image: string
    basePrice: number
    salePrice?: number | null
  }
  variant: {
    size?: string | null
    color?: string | null
    colorHex?: string | null
    sku: string
    availableQty: number
  }
  lineTotal: number
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: string
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  createdAt: string
  items: OrderItem[]
  address?: Address | null
  shipment?: Shipment | null
}

export interface OrderItem {
  id: string
  productName: string
  variantInfo: string
  quantity: number
  price: number
  image?: string | null
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'

export interface Address {
  id: string
  label?: string | null
  fullName: string
  phone: string
  line1: string
  line2?: string | null
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

export interface Shipment {
  carrier?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  estimatedDelivery?: string | null
}

export interface Category {
  id: string
  name: string
  slug: string
  image?: string | null
  productCount?: number
  children?: Category[]
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
}
