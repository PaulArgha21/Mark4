'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface AnnouncementBarProps {
  text: string
  link?: string | null
}

export function AnnouncementBar({ text, link }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="relative bg-clay-midnight text-clay-text-on-dark text-xs md:text-sm py-2 px-4 text-center"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-center gap-2">
            {link ? (
              <Link href={link} className="hover:underline inline-flex items-center gap-1">
                <span>{text}</span>
                <ChevronRight size={14} />
              </Link>
            ) : (
              <span>{text}</span>
            )}
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close announcement"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
