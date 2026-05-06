'use client'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { springs } from '@/lib/animations'

interface ColorOption {
  name: string
  hex?: string
}

interface ColorSelectorProps {
  colors: ColorOption[]
  selected: string | null
  onSelect: (color: string) => void
}

export function ColorSelector({ colors, selected, onSelect }: ColorSelectorProps) {
  if (!colors.length) return null

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-clay-text">
        Color{selected && <span className="font-normal text-clay-text-muted ml-2">— {selected}</span>}
      </h4>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((color) => {
          const isSelected = selected === color.name
          return (
            <motion.button
              key={color.name}
              onClick={() => onSelect(color.name)}
              className="relative group"
              whileTap={{ scale: 0.9 }}
              transition={springs.bouncy}
              title={color.name}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-full border-2 transition-all',
                  isSelected ? 'border-clay-midnight scale-110' : 'border-clay-border-light hover:border-clay-text-muted'
                )}
                style={{ backgroundColor: color.hex || '#ccc' }}
              >
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={springs.bouncy}
                  >
                    <Check
                      size={16}
                      className={cn(
                        'drop-shadow',
                        (color.hex && isLightColor(color.hex)) ? 'text-clay-midnight' : 'text-white'
                      )}
                      strokeWidth={3}
                    />
                  </motion.div>
                )}
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-clay-text-muted whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {color.name}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 155
}
