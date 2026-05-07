'use client'
import { useState, useCallback } from 'react'
import { Plus, X, Check } from 'lucide-react'

export interface ColorOption {
  name: string
  hex: string
}

const PALETTE: ColorOption[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ivory', hex: '#FFFFF0' },
  { name: 'Cream', hex: '#FFFDD0' },
  { name: 'Beige', hex: '#F5F5DC' },
  { name: 'Tan', hex: '#D2B48C' },
  { name: 'Khaki', hex: '#C3B091' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Chocolate', hex: '#7B3F00' },
  { name: 'Coffee', hex: '#6F4E37' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Wine', hex: '#722F37' },
  { name: 'Red', hex: '#E53E3E' },
  { name: 'Coral', hex: '#FF7F50' },
  { name: 'Rose', hex: '#FF007F' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Hot Pink', hex: '#FF69B4' },
  { name: 'Magenta', hex: '#FF00FF' },
  { name: 'Peach', hex: '#FFCBA4' },
  { name: 'Orange', hex: '#FF8C00' },
  { name: 'Rust', hex: '#B7410E' },
  { name: 'Gold', hex: '#FFD700' },
  { name: 'Yellow', hex: '#FFD600' },
  { name: 'Mustard', hex: '#FFDB58' },
  { name: 'Lime', hex: '#32CD32' },
  { name: 'Green', hex: '#228B22' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Sage', hex: '#9DC183' },
  { name: 'Mint', hex: '#98FF98' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Turquoise', hex: '#40E0D0' },
  { name: 'Aqua', hex: '#00FFFF' },
  { name: 'Sky Blue', hex: '#87CEEB' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Indigo', hex: '#4B0082' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Lavender', hex: '#E6E6FA' },
  { name: 'Violet', hex: '#8B00FF' },
  { name: 'Plum', hex: '#8E4585' },
  { name: 'Charcoal', hex: '#36454F' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Light Grey', hex: '#D3D3D3' },
  { name: 'Silver', hex: '#C0C0C0' },
  { name: 'Gunmetal', hex: '#2C3539' },
  { name: 'Multi', hex: 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f)' },
]

interface ColorPickerProps {
  selected: ColorOption[]
  onChange: (colors: ColorOption[]) => void
}

export function ColorPicker({ selected, onChange }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customHex, setCustomHex] = useState('#D6336C')

  const toggle = useCallback((color: ColorOption) => {
    const exists = selected.find(c => c.hex === color.hex)
    if (exists) {
      onChange(selected.filter(c => c.hex !== color.hex))
    } else {
      onChange([...selected, color])
    }
  }, [selected, onChange])

  const addCustom = useCallback(() => {
    if (!customName.trim() || !customHex) return
    const newColor = { name: customName.trim(), hex: customHex }
    onChange([...selected, newColor])
    setCustomName('')
    setCustomHex('#D6336C')
    setShowCustom(false)
  }, [customName, customHex, selected, onChange])

  const remove = useCallback((hex: string) => {
    onChange(selected.filter(c => c.hex !== hex))
  }, [selected, onChange])

  return (
    <div className="space-y-3">
      {/* Selected colors */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
          {selected.map(c => (
            <div key={c.hex} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border" style={{ borderColor: 'var(--portal-border)' }}>
              <span
                className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                style={{ background: c.hex.startsWith('linear') ? c.hex : c.hex }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>{c.name}</span>
              <button type="button" onClick={() => remove(c.hex)} className="text-red-400 hover:text-red-300">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Color palette */}
      <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
        {PALETTE.map(color => {
          const isSelected = selected.some(c => c.hex === color.hex)
          return (
            <button
              key={color.hex}
              type="button"
              onClick={() => toggle(color)}
              title={color.name}
              className={`relative w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                isSelected ? 'border-[var(--portal-accent)] ring-2 ring-[var(--portal-accent)]/30 scale-110' : 'border-transparent hover:border-white/20'
              }`}
              style={{ background: color.hex.startsWith('linear') ? color.hex : color.hex }}
            >
              {isSelected && (
                <Check size={12} className="absolute inset-0 m-auto" style={{ color: isLightColor(color.hex) ? '#000' : '#fff' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Custom color */}
      {showCustom ? (
        <div className="flex items-end gap-2 p-3 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
          <div className="space-y-1 flex-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--portal-muted)' }}>Name</label>
            <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Dusty Rose" className="portal-input-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--portal-muted)' }}>Color</label>
            <div className="flex items-center gap-1">
              <input type="color" value={customHex} onChange={e => setCustomHex(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              <input value={customHex} onChange={e => setCustomHex(e.target.value)} className="portal-input-sm w-20 font-mono" />
            </div>
          </div>
          <button type="button" onClick={addCustom} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--portal-accent)] text-white">Add</button>
          <button type="button" onClick={() => setShowCustom(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--portal-muted)' }}>Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowCustom(true)} className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-[var(--portal-border)] hover:border-[var(--portal-accent)] transition-colors" style={{ color: 'var(--portal-muted)' }}>
          <Plus size={12} /> Custom Color
        </button>
      )}
    </div>
  )
}

function isLightColor(hex: string): boolean {
  if (hex.startsWith('linear')) return false
  const c = hex.replace('#', '')
  const r = parseInt(c.substr(0, 2), 16)
  const g = parseInt(c.substr(2, 2), 16)
  const b = parseInt(c.substr(4, 2), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 155
}
