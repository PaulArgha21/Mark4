'use client'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

interface Story {
  id: string
  title: string
  thumbnailUrl: string
  linkUrl: string
  gradientStart: string
  gradientEnd: string
}

interface StoryBubblesProps {
  stories: Story[]
}

export function StoryBubbles({ stories }: StoryBubblesProps) {
  if (!stories.length) return null

  return (
    <motion.div
      className="flex gap-3 md:gap-5 overflow-x-auto pb-3 px-4 md:px-0 md:justify-center app-scroll-x -mx-4 md:mx-0"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {stories.map((story, i) => (
        <motion.div key={story.id} variants={fadeUpVariants} className="flex-shrink-0">
          <Link href={story.linkUrl} className="group flex flex-col items-center gap-2">
            {/* Square card with 3D shadow */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.95 }}
              transition={springs.bouncy}
            >
              {/* 3D glow behind */}
              <div
                className="absolute -inset-1 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500"
                style={{
                  background: `linear-gradient(135deg, ${story.gradientStart}, ${story.gradientEnd})`,
                }}
              />
              {/* Gradient Border */}
              <div
                className="relative w-[76px] h-[76px] md:w-[92px] md:h-[92px] rounded-2xl p-[2.5px]"
                style={{
                  background: `linear-gradient(${135 + i * 30}deg, ${story.gradientStart}, ${story.gradientEnd})`,
                  boxShadow: `0 6px 20px -4px ${story.gradientStart}40, 0 2px 6px -1px rgba(0,0,0,0.12)`,
                }}
              >
                <div className="w-full h-full rounded-[13px] bg-clay-bg-base p-[2px]">
                  <div className="w-full h-full rounded-xl overflow-hidden relative">
                    <Image
                      src={story.thumbnailUrl}
                      alt={story.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="92px"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Label */}
            <span className="text-[10px] md:text-[11px] font-semibold text-clay-text-muted group-hover:text-clay-text transition-colors text-center max-w-[76px] md:max-w-[92px] truncate">
              {story.title}
            </span>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
