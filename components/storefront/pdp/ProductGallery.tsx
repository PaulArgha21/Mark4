'use client'
import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductGalleryProps {
  images: string[]
  productId: string
  /** If true, renders full-bleed (no rounded corners, fills parent) */
  fullBleed?: boolean
}

export function ProductGallery({ images, productId, fullBleed = false }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const goNext = useCallback(() => setActiveIndex(i => (i + 1) % images.length), [images.length])
  const goPrev = useCallback(() => setActiveIndex(i => (i - 1 + images.length) % images.length), [images.length])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current ?? 0))
    if (Math.abs(dx) > 40 && dy < 60) {
      if (dx < 0) goNext(); else goPrev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (!images.length) return null

  const validImages = images.filter(Boolean)
  if (!validImages.length) return null

  return (
    <>
      <div className={cn('relative overflow-hidden', fullBleed ? 'w-full' : 'rounded-2xl')}>
        {/* Main image area */}
        <div
          className={cn('relative w-full', fullBleed ? 'h-[62vw] max-h-[420px] min-h-[280px]' : 'aspect-[3/4]')}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={() => setIsZoomed(true)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0"
            >
              <Image
                src={validImages[activeIndex]}
                alt={`Product image ${activeIndex + 1}`}
                fill
                className="object-cover"
                priority={activeIndex === 0}
                sizes={fullBleed
                  ? '(max-width: 768px) 100vw, 50vw'
                  : '(max-width: 768px) 100vw, 50vw'
                }
              />
            </motion.div>
          </AnimatePresence>

          {/* Arrow nav — desktop only */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goPrev() }}
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <ChevronLeft size={16} className="text-gray-800" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goNext() }}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <ChevronRight size={16} className="text-gray-800" />
              </button>
            </>
          )}

          {/* Zoom button */}
          <button
            onClick={e => { e.stopPropagation(); setIsZoomed(true) }}
            className="hidden md:flex absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <ZoomIn size={14} className="text-gray-700" />
          </button>
        </div>

        {/* Dot indicators */}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {validImages.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setActiveIndex(i) }}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === activeIndex
                    ? 'w-5 h-2 bg-white shadow-sm'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail strip — desktop only */}
      {validImages.length > 1 && (
        <div className="hidden md:flex gap-2 mt-3 overflow-x-auto">
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-all',
                i === activeIndex ? 'border-rose-500 scale-105' : 'border-transparent hover:border-gray-300'
              )}
            >
              <Image src={img} alt={`Thumb ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen zoom modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
          >
            {/* Image */}
            <motion.div
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.92 }}
              className="relative w-full h-full"
              onClick={e => e.stopPropagation()}
              onTouchStart={onTouchStart}
              onTouchEnd={e => {
                if (touchStartX.current === null) return
                const dx = e.changedTouches[0].clientX - touchStartX.current
                if (Math.abs(dx) > 40) { if (dx < 0) goNext(); else goPrev() }
                touchStartX.current = null
              }}
            >
              <Image
                src={validImages[activeIndex]}
                alt="Zoomed"
                fill
                className="object-contain"
                sizes="100vw"
              />
            </motion.div>

            {/* Controls */}
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors z-10"
            >
              <X size={18} />
            </button>
            {validImages.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); goPrev() }} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors z-10">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={e => { e.stopPropagation(); goNext() }} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors z-10">
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {validImages.map((_, i) => (
                    <div key={i} className={cn('rounded-full transition-all', i === activeIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40')} />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
