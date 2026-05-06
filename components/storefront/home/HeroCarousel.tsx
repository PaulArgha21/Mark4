'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { springs, easings } from '@/lib/animations'

interface HeroSlide {
  id: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
  imageUrl: string
  mobileImageUrl?: string
  overlayColor?: string
}

interface HeroCarouselProps {
  slides: HeroSlide[]
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

const textVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.15, duration: 0.6, ease: easings.smoothOut },
  }),
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [[current, direction], setCurrent] = useState([0, 0])
  const [isPaused, setIsPaused] = useState(false)

  const paginate = useCallback((newDirection: number) => {
    setCurrent(([prev]) => {
      const next = (prev + newDirection + slides.length) % slides.length
      return [next, newDirection]
    })
  }, [slides.length])

  useEffect(() => {
    if (isPaused || slides.length <= 1) return
    const timer = setInterval(() => paginate(1), 5000)
    return () => clearInterval(timer)
  }, [isPaused, paginate, slides.length])

  if (!slides.length) return null
  const slide = slides[current]

  return (
    <div
      className="relative w-full h-[60vh] md:h-screen overflow-hidden -mt-[52px] md:-mt-[72px] pt-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: easings.smoothOut }}
          className="absolute inset-0"
        >
          {/* Background Image with Ken Burns zoom */}
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.06] }}
            transition={{ duration: 6, ease: 'linear' }}
          >
            <Image
              src={slide.imageUrl}
              alt={slide.title}
              fill
              className="object-cover"
              priority={current === 0}
              sizes="100vw"
            />
          </motion.div>

          {/* Multi-layer overlay */}
          <div
            className="absolute inset-0"
            style={{ background: slide.overlayColor || 'rgba(0,0,0,0.25)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex items-end pb-24 md:pb-28 lg:items-center lg:pb-0">
            <div className="max-w-7xl mx-auto px-4 w-full">
              <div className="max-w-xl">
                <motion.p
                  custom={0}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-white/70 text-[11px] md:text-xs font-semibold tracking-[0.25em] uppercase mb-4"
                >
                  {slide.subtitle}
                </motion.p>
                <motion.h1
                  custom={1}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-7 drop-shadow-xl"
                >
                  {slide.title}
                </motion.h1>
                <motion.div
                  custom={2}
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link href={slide.ctaLink}>
                    <motion.button
                      className="inline-flex items-center gap-2 bg-white text-clay-midnight px-8 py-3.5 rounded-2xl text-sm font-semibold hover:bg-white/90 transition-all"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
                    >
                      {slide.ctaText}
                      <ChevronRight size={16} />
                    </motion.button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows — Glassmorphic */}
      {slides.length > 1 && (
        <>
          <motion.button
            onClick={() => paginate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl glass-frost hidden md:flex items-center justify-center text-white hover:bg-white/25 transition-all z-10"
            aria-label="Previous slide"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft size={20} />
          </motion.button>
          <motion.button
            onClick={() => paginate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl glass-frost hidden md:flex items-center justify-center text-white hover:bg-white/25 transition-all z-10"
            aria-label="Next slide"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight size={20} />
          </motion.button>
        </>
      )}

      {/* Pagination — Progress bars */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent([i, i > current ? 1 : -1])}
              className="group relative h-6 flex items-center"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div className="h-[3px] rounded-full bg-white/30 overflow-hidden" style={{ width: i === current ? 40 : 16 }}>
                {i === current && (
                  <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: isPaused ? 999 : 5, ease: 'linear' }}
                    key={`progress-${current}`}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
