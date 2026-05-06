'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function SplashScreen() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    if (sessionStorage.getItem('aprdite-splash-shown')) return false
    sessionStorage.setItem('aprdite-splash-shown', '1')
    return true
  })

  useEffect(() => {
    if (!visible) return

    // Animate progress from 0 to 100
    const duration = 2000 // ms
    const interval = 20 // ms per tick
    const step = 100 / (duration / interval)
    let current = 0

    const timer = setInterval(() => {
      current += step
      if (current >= 100) {
        current = 100
        clearInterval(timer)
        // Hold at 100% briefly then fade out
        setTimeout(() => setVisible(false), 400)
      }
      setProgress(current)
    }, interval)

    return () => clearInterval(timer)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-clay-bg-base"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Big watermark logo centered as background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.img
              src="/mylogo.png"
              alt=""
              className="w-[70vw] h-[70vw] max-w-[420px] max-h-[420px] object-contain opacity-[0.06]"
              draggable={false}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 0.06, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {/* Bottom section: brand name + loading bar */}
          <div className="mt-auto mb-16 flex flex-col items-center gap-4">
            <motion.p
              className="font-display text-xl font-bold tracking-widest uppercase"
              style={{
                background: 'linear-gradient(135deg, var(--clay-rose), var(--clay-rose-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              Aprdite
            </motion.p>

            {/* Narrow loading bar */}
            <div className="w-32 h-[2px] rounded-full bg-clay-border/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, var(--clay-rose), var(--clay-rose-light))',
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
