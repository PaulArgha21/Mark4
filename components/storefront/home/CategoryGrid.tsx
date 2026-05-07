'use client'
import Link from 'next/link'
import useSWR from 'swr'
import { CategoryGridSkeleton } from '@/components/ui/SkeletonLoaders'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

interface Category {
  id: string
  name: string
  slug: string
  image: string
  productCount?: number
}

// Fashion industry icon map
const FASHION_ICONS: Record<string, string> = {
  // Women's Clothing
  dress: '👗', dresses: '👗', women: '👗', 'women\'s': '👗', 'womens': '👗',
  tops: '👚', blouse: '👚', blouses: '👚', 'crop top': '👚',
  skirt: '💃', skirts: '💃', midi: '💃',
  // Men's Clothing
  shirt: '👔', shirts: '👔', men: '👔', 'men\'s': '👔', 'mens': '👔', formal: '👔',
  tshirt: '👕', 't-shirt': '👕', tshirts: '👕', casual: '👕',
  // Unisex Bottoms
  jeans: '👖', pants: '👖', trousers: '👖', bottoms: '👖', denim: '👖', shorts: '👖',
  // Outerwear
  jacket: '🧥', jackets: '🧥', coat: '🧥', coats: '🧥', outerwear: '🧥', winter: '🧥', hoodie: '🧥', hoodies: '🧥', sweater: '🧥',
  suit: '🤵', suits: '🤵', blazer: '🤵', blazers: '🤵',
  // Footwear
  shoe: '👟', shoes: '👟', sneakers: '👟', footwear: '👟', sneaker: '👟',
  heel: '👠', heels: '👠', sandal: '👠', sandals: '👠', stiletto: '👠',
  boot: '👢', boots: '👢', ankle: '👢',
  slipper: '🩴', slippers: '🩴', flip: '🩴', loafer: '🥿', loafers: '🥿', flat: '🥿', flats: '🥿',
  // Bags
  bag: '👜', bags: '👜', handbag: '👜', handbags: '👜', purse: '👜', tote: '👜', clutch: '👜',
  backpack: '🎒', backpacks: '🎒',
  // Head & Neck
  hat: '🧢', hats: '🧢', cap: '🧢', caps: '🧢', headwear: '🧢', beanie: '🧢',
  scarf: '🧣', scarves: '🧣', stole: '🧣', dupatta: '🧣', shawl: '🧣',
  // Accessories
  glove: '🧤', gloves: '🧤',
  sock: '🧦', socks: '🧦',
  belt: '🪢', belts: '🪢', tie: '👔', ties: '👔',
  wallet: '👝', wallets: '👝',
  // Jewelry & Beauty
  jewelry: '💎', jewellery: '💎', ring: '💍', rings: '💍', earring: '💎', earrings: '💎', bracelet: '💎',
  necklace: '📿', pendant: '📿', chain: '📿', mangalsutra: '📿',
  watch: '⌚', watches: '⌚', smartwatch: '⌚',
  sunglasses: '🕶️', glasses: '🕶️', eyewear: '🕶️',
  perfume: '🧴', fragrance: '🧴', beauty: '💄', cosmetics: '💄', makeup: '💄', skincare: '🧴',
  // Innerwear & Swim
  lingerie: '👙', swimwear: '👙', bikini: '👙', swim: '👙', innerwear: '🩲',
  // Kids
  kids: '🧒', children: '🧒', baby: '👶', 'boys': '👦', 'girls': '👧',
  // Indian / Ethnic
  ethnic: '🪷', saree: '🪷', sarees: '🪷', kurta: '🪷', kurti: '🪷', traditional: '🪷', indian: '🪷', lehenga: '🪷', salwar: '🪷', anarkali: '🪷', palazzo: '🪷',
  // Sportswear
  sportswear: '🏃', activewear: '🏃', gym: '🏋️', fitness: '🏋️', sports: '⚽', athleisure: '🏃', yoga: '🧘',
  // Occasions
  wedding: '💒', bridal: '💒', party: '🥂', partywear: '🥂', festive: '🎉', festival: '🎉',
  office: '💼', work: '💼', 'work wear': '💼',
  night: '🌙', nightwear: '🌙', sleepwear: '🌙', loungewear: '🛋️', pyjama: '🌙',
  // Fallbacks
  new: '✨', trending: '🔥', sale: '🏷️', all: '🛍️', accessories: '✨',
}

// Real fashion categories that always show (merged with DB categories)
const FALLBACK_CATEGORIES: Category[] = [
  { id: 'fb-women',      name: 'Women',        slug: 'women',        image: '', productCount: 0 },
  { id: 'fb-men',        name: 'Men',          slug: 'men',          image: '', productCount: 0 },
  { id: 'fb-kids',       name: 'Kids',         slug: 'kids',         image: '', productCount: 0 },
  { id: 'fb-ethnic',     name: 'Ethnic Wear',  slug: 'ethnic-wear',  image: '', productCount: 0 },
  { id: 'fb-footwear',   name: 'Footwear',     slug: 'footwear',     image: '', productCount: 0 },
  { id: 'fb-bags',       name: 'Bags',         slug: 'bags',         image: '', productCount: 0 },
  { id: 'fb-jewelry',    name: 'Jewelry',      slug: 'jewelry',      image: '', productCount: 0 },
  { id: 'fb-watches',    name: 'Watches',      slug: 'watches',      image: '', productCount: 0 },
  { id: 'fb-beauty',     name: 'Beauty',       slug: 'beauty',       image: '', productCount: 0 },
  { id: 'fb-sportswear', name: 'Sportswear',   slug: 'sportswear',   image: '', productCount: 0 },
  { id: 'fb-winter',     name: 'Winter Wear',  slug: 'winter-wear',  image: '', productCount: 0 },
  { id: 'fb-sunglasses', name: 'Sunglasses',   slug: 'sunglasses',   image: '', productCount: 0 },
  { id: 'fb-loungewear', name: 'Loungewear',   slug: 'loungewear',   image: '', productCount: 0 },
  { id: 'fb-partywear',  name: 'Party Wear',   slug: 'party-wear',   image: '', productCount: 0 },
  { id: 'fb-denim',      name: 'Denim',        slug: 'denim',        image: '', productCount: 0 },
  { id: 'fb-accessories', name: 'Accessories', slug: 'accessories',  image: '', productCount: 0 },
]

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(FASHION_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '🛍️'
}

export function CategoryGrid({ isCompact = false }: { isCompact?: boolean }) {
  const { data: apiCategories, isLoading } = useSWR<Category[]>('/api/storefront/categories', fetcher)

  if (isLoading) return <CategoryGridSkeleton />

  // Merge DB categories with fallbacks — DB takes priority, fill with fallbacks
  const dbSlugs = new Set((apiCategories || []).map(c => c.slug))
  const merged = [
    ...(apiCategories || []),
    ...FALLBACK_CATEGORIES.filter(fb => !dbSlugs.has(fb.slug)),
  ]

  if (!merged.length) return null

  return (
    <div className="overflow-x-auto app-scroll-x will-change-transform">
      <div
        className="flex items-end px-4 md:px-0 md:flex-wrap md:justify-start"
        style={{
          gap: isCompact ? '6px' : '10px',
          paddingTop: isCompact ? '6px' : '0px',
          paddingBottom: isCompact ? '6px' : '8px',
          transition: 'gap 0.4s cubic-bezier(0.32,0.72,0,1), padding 0.4s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {merged.map((cat) => (
          <Link key={cat.id} href={`/category/${cat.slug}`} className="flex-shrink-0 group block">
            <div
              className="flex flex-col items-center"
              style={{
                gap: isCompact ? '0px' : '6px',
                transition: 'gap 0.4s cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              {/* Icon bubble — collapses via transform (GPU, no layout reflow) */}
              <div
                style={{
                  maxHeight: isCompact ? '0px' : '58px',
                  overflow: 'hidden',
                  transition: 'max-height 0.4s cubic-bezier(0.32,0.72,0,1)',
                }}
              >
                <div
                  className="w-[58px] h-[58px] rounded-2xl flex items-center justify-center border overflow-hidden bg-clay-bg-elevated"
                  style={{
                    opacity: isCompact ? 0 : 1,
                    borderColor: isCompact ? 'transparent' : 'var(--clay-border-light)',
                    boxShadow: isCompact ? 'none' : 'var(--clay-shadow-md), inset 0 1px 0 rgba(255,255,255,0.15)',
                    transform: isCompact ? 'scale(0.4)' : 'scale(1)',
                    transition: 'opacity 0.3s ease, transform 0.35s cubic-bezier(0.32,0.72,0,1), border-color 0.3s ease, box-shadow 0.3s ease',
                  }}
                >
                  <span className="text-[22px] drop-shadow-sm group-hover:scale-110 transition-transform">
                    {getCategoryIcon(cat.name)}
                  </span>
                </div>
              </div>
              {/* Name — morphs: muted small text → punchy 3D brand pill */}
              <span
                className="whitespace-nowrap text-center leading-tight"
                style={{
                  fontSize: isCompact ? '11px' : '10px',
                  fontWeight: isCompact ? 800 : 500,
                  maxWidth: isCompact ? '200px' : '60px',
                  padding: isCompact ? '5px 12px' : '0px',
                  borderRadius: isCompact ? '9999px' : '0px',
                  color: isCompact ? 'var(--clay-rose)' : 'var(--clay-text-muted)',
                  background: isCompact
                    ? 'linear-gradient(135deg, rgba(232,67,147,0.08), rgba(253,121,168,0.08))'
                    : 'transparent',
                  border: isCompact ? '1px solid rgba(232,67,147,0.2)' : '1px solid transparent',
                  textShadow: isCompact ? '0 1px 2px rgba(232,67,147,0.15)' : 'none',
                  boxShadow: isCompact
                    ? '0 2px 8px rgba(232,67,147,0.12), 0 1px 2px rgba(232,67,147,0.08), inset 0 1px 0 rgba(255,255,255,0.25)'
                    : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'all 0.4s cubic-bezier(0.32,0.72,0,1)',
                }}
              >
                {cat.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
