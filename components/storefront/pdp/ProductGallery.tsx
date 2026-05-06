'use client'
import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'

interface ProductGalleryProps {
  images: string[]
  productId: string
}

export function ProductGallery({ images, productId }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  if (!images.length) return null

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative aspect-[3/4] rounded-clay-xl overflow-hidden clay-card group cursor-zoom-in"
        onClick={() => setIsZoomed(true)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={images[activeIndex]}
              alt={`Product image ${activeIndex + 1}`}
              fill
              className="object-cover"
              priority={activeIndex === 0}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIndex(i => i > 0 ? i - 1 : images.length - 1) }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-clay-bg-surface/80 backdrop-blur flex items-center justify-center shadow-clay-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIndex(i => i < images.length - 1 ? i + 1 : 0) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-clay-bg-surface/80 backdrop-blur flex items-center justify-center shadow-clay-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Zoom icon */}
        <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-clay-bg-surface/80 backdrop-blur flex items-center justify-center shadow-clay-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn size={16} className="text-clay-text" />
        </div>

        {/* Image counter */}
        <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur">
          {activeIndex + 1}/{images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto clay-scrollbar pb-1">
          {images.map((img, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative w-16 h-20 md:w-20 md:h-24 rounded-clay-sm overflow-hidden flex-shrink-0 border-2 transition-colors',
                i === activeIndex ? 'border-clay-rose' : 'border-transparent hover:border-clay-border'
              )}
              whileTap={{ scale: 0.95 }}
              transition={springs.bouncy}
            >
              <Image
                src={img}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </motion.button>
          ))}
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full h-full max-w-4xl max-h-[90vh] m-4"
            >
              <Image
                src={images[activeIndex]}
                alt="Zoomed product"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </motion.div>
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
