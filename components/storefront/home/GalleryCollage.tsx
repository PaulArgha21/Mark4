'use client'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

interface GalleryItem {
  id: string
  imageUrl: string
  caption?: string
  linkUrl?: string
  sizeClass: string
}

interface GalleryCollageProps {
  items: GalleryItem[]
}

const sizeMap: Record<string, string> = {
  small:  'col-span-1 row-span-1',
  medium: 'col-span-1 row-span-1',
  large:  'col-span-2 row-span-2',
  tall:   'col-span-1 row-span-2',
  wide:   'col-span-2 row-span-1',
}

export function GalleryCollage({ items }: GalleryCollageProps) {
  if (!items.length) return null

  return (
    <div className="max-w-7xl mx-auto px-4">
      <motion.h2
        className="font-display text-2xl md:text-3xl font-bold text-clay-text mb-6"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        Style Gallery
      </motion.h2>
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 auto-rows-[200px] md:auto-rows-[220px] gap-3 md:gap-4"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
      >
        {items.map((item) => (
          <motion.div
            key={item.id}
            variants={fadeUpVariants}
            className={sizeMap[item.sizeClass] || 'col-span-1 row-span-1'}
          >
            <Link href={item.linkUrl || '#'} className="group block h-full">
              <motion.div
                className="relative h-full rounded-clay-lg overflow-hidden shadow-clay-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={springs.gentle}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.caption || ''}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-end p-4">
                  {item.caption && (
                    <motion.p
                      className="text-white font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0"
                    >
                      {item.caption}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
