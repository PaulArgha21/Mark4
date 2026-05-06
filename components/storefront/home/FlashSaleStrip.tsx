'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Zap, Clock } from 'lucide-react'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { PriceDisplay } from '@/components/ui/PriceDisplay'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { cn } from '@/lib/utils'

interface FlashSaleProduct {
  id: string
  slug: string
  name: string
  brand?: string | null
  images: string[]
  basePrice: number
  flashSalePrice: number
  stockLimit: number
  soldCount: number
}

interface FlashSaleData {
  id: string
  name: string
  slug: string
  endDate: string
  displayCountdown: boolean
  products: FlashSaleProduct[]
}

interface FlashSaleStripProps {
  flashSale: FlashSaleData
}

function useCountdown(endDate: string) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(endDate).getTime() - Date.now()
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 }
      return {
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      }
    }
    setTimeLeft(calculate())
    const timer = setInterval(() => setTimeLeft(calculate()), 1000)
    return () => clearInterval(timer)
  }, [endDate])

  return timeLeft
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="w-10 h-10 md:w-12 md:h-12 bg-clay-bg-surface rounded-clay-sm flex items-center justify-center shadow-clay-sm"
        key={value}
        initial={{ scale: 1.2, rotateX: -90 }}
        animate={{ scale: 1, rotateX: 0 }}
        transition={springs.bouncy}
      >
        <span className="font-display text-lg md:text-xl font-bold text-clay-midnight">
          {String(value).padStart(2, '0')}
        </span>
      </motion.div>
      <span className="text-[10px] text-white/70 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  )
}

export function FlashSaleStrip({ flashSale }: FlashSaleStripProps) {
  const { hours, minutes, seconds } = useCountdown(flashSale.endDate)

  if (!flashSale.products?.length) return null

  return (
    <div className="relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 clay-gradient-rose" />
      <div className="absolute inset-0 bg-gradient-to-r from-clay-rose-dark/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 bg-white/20 rounded-clay-sm flex items-center justify-center"
              animate={{ rotate: [0, -10, 10, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
            >
              <Zap size={22} className="text-clay-butter fill-clay-butter" />
            </motion.div>
            <div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-white">
                {flashSale.name}
              </h2>
              <p className="text-sm text-white/70">Don&apos;t miss these incredible deals!</p>
            </div>
          </div>

          {/* Countdown */}
          {flashSale.displayCountdown && (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-white/70" />
              <span className="text-xs text-white/70 mr-1">Ends in</span>
              <div className="flex gap-1.5">
                <CountdownBlock value={hours} label="hrs" />
                <span className="text-white/50 text-lg font-bold self-start mt-2">:</span>
                <CountdownBlock value={minutes} label="min" />
                <span className="text-white/50 text-lg font-bold self-start mt-2">:</span>
                <CountdownBlock value={seconds} label="sec" />
              </div>
            </div>
          )}
        </div>

        {/* Products */}
        <motion.div
          className="flex gap-3 md:gap-4 overflow-x-auto pb-2 app-scroll-x -mx-4 px-4 md:mx-0 md:px-0"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {flashSale.products.map((product) => {
            const progress = product.stockLimit > 0
              ? (product.soldCount / product.stockLimit) * 100
              : 0

            return (
              <motion.div
                key={product.id}
                variants={fadeUpVariants}
                className="flex-shrink-0 w-[160px] md:w-[200px]"
              >
                <Link href={`/product/${product.slug}`}>
                  <motion.div
                    className="bg-clay-bg-surface rounded-clay-lg overflow-hidden shadow-clay-md hover:shadow-clay-lg transition-shadow"
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={springs.gentle}
                  >
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                      <div className="absolute top-2 left-2">
                        <ClayBadge variant="sale" size="sm">
                          {Math.round((1 - product.flashSalePrice / product.basePrice) * 100)}% OFF
                        </ClayBadge>
                      </div>
                    </div>
                    <div className="p-2.5 space-y-1.5">
                      {product.brand && (
                        <p className="text-[10px] text-clay-text-muted uppercase tracking-wider truncate">
                          {product.brand}
                        </p>
                      )}
                      <h3 className="text-xs font-medium text-clay-text line-clamp-1">
                        {product.name}
                      </h3>
                      <PriceDisplay
                        price={product.basePrice}
                        salePrice={product.flashSalePrice}
                        variant="inline"
                      />
                      {/* Stock progress */}
                      <div className="space-y-1">
                        <div className="h-1.5 bg-clay-bg-sunken rounded-full overflow-hidden">
                          <motion.div
                            className={cn(
                              'h-full rounded-full',
                              progress > 75 ? 'bg-clay-error' : progress > 50 ? 'bg-clay-warning' : 'bg-clay-sage'
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                        <p className="text-[10px] text-clay-text-muted">
                          {product.soldCount}/{product.stockLimit} sold
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
