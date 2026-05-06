'use client'
import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ClayProductCard, type ProductCardData } from '@/components/ui/ClayProductCard'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

interface NewArrivalsRowProps {
  products: ProductCardData[]
}

export function NewArrivalsRow({ products }: NewArrivalsRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 280
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (!products.length) return null

  return (
    <div className="relative group/row">
      {/* Scroll arrows — hidden on mobile, swipe is native */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-clay-bg-surface rounded-full shadow-clay-lg items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-clay-bg-sunken"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-clay-bg-surface rounded-full shadow-clay-lg items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity hover:bg-clay-bg-sunken"
      >
        <ChevronRight size={20} />
      </button>

      <motion.div
        ref={scrollRef}
        className="flex gap-3 md:gap-4 overflow-x-auto pb-4 app-scroll-x scroll-smooth"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {products.map((product) => (
          <motion.div
            key={product.id}
            variants={fadeUpVariants}
            className="flex-shrink-0 w-[155px] md:w-[210px] lg:w-[210px]"
          >
            <ClayProductCard product={product} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
