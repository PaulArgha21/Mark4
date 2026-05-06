'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import useSWR from 'swr'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
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

export function CategoryGrid() {
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
    <div>
      {/* Side-scrollable row — no container on mobile, app background */}
      <motion.div
        className="flex gap-2.5 md:gap-3 overflow-x-auto pb-2 px-4 md:px-0 app-scroll-x md:flex-wrap md:justify-start"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {merged.map((cat) => (
          <motion.div key={cat.id} variants={fadeUpVariants} className="flex-shrink-0">
            <Link href={`/category/${cat.slug}`} className="group block">
              <motion.div
                className="flex flex-col items-center gap-1.5"
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.93 }}
                transition={springs.bouncy}
              >
                {/* Icon bubble — punchy 3D box */}
                <div
                  className="w-[58px] h-[58px] md:w-[70px] md:h-[70px] rounded-2xl flex items-center justify-center border border-clay-border-light group-hover:border-clay-rose/40 transition-all duration-300 bg-clay-bg-elevated"
                  style={{
                    boxShadow: 'var(--clay-shadow-md), inset 0 1px 0 rgba(255,255,255,0.15)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <span className="text-[22px] md:text-[26px] group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                    {getCategoryIcon(cat.name)}
                  </span>
                </div>
                {/* Name */}
                <span className="text-[10px] md:text-[11px] font-medium text-clay-text-muted group-hover:text-clay-text transition-colors text-center max-w-[60px] md:max-w-[72px] truncate leading-tight">
                  {cat.name}
                </span>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
