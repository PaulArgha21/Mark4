'use client'
import { useCallback, useMemo } from 'react'
import { Trash2, Copy } from 'lucide-react'
import { ColorOption } from './ColorPicker'
import { SIZE_SEGMENTS } from './SizeSelector'

export interface VariantRow {
  id: string
  sku: string
  size: string
  color: string
  colorHex: string
  priceDelta: number
  weight: number | null
  stock: number
  isActive: boolean
}

interface VariantMatrixProps {
  variants: VariantRow[]
  colors: ColorOption[]
  sizes: string[]
  productName: string
  onChange: (variants: VariantRow[]) => void
}

function generateSKU(name: string, size: string, color: string): string {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
  const sizeCode = size || 'FS'
  const colorCode = color.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
  const uid = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${colorCode}-${sizeCode}-${uid}`
}

export function VariantMatrix({ variants, colors, sizes, productName, onChange }: VariantMatrixProps) {
  // Generate all combinations
  const generateAll = useCallback(() => {
    const generated: VariantRow[] = []
    const effectiveSizes = sizes.length > 0 ? sizes : ['FREE']
    const effectiveColors = colors.length > 0 ? colors : [{ name: 'Default', hex: '' }]

    for (const color of effectiveColors) {
      for (const size of effectiveSizes) {
        // Check if this combination already exists
        const existing = variants.find(v => v.size === size && v.color === color.name)
        if (existing) {
          generated.push(existing)
        } else {
          generated.push({
            id: crypto.randomUUID(),
            sku: generateSKU(productName, size, color.name),
            size,
            color: color.name,
            colorHex: color.hex,
            priceDelta: 0,
            weight: null,
            stock: 0,
            isActive: true,
          })
        }
      }
    }
    onChange(generated)
  }, [variants, colors, sizes, productName, onChange])

  // Update a single variant field
  const updateVariant = useCallback((id: string, field: keyof VariantRow, value: any) => {
    onChange(variants.map(v => v.id === id ? { ...v, [field]: value } : v))
  }, [variants, onChange])

  // Remove a variant
  const removeVariant = useCallback((id: string) => {
    onChange(variants.filter(v => v.id !== id))
  }, [variants, onChange])

  // Bulk update stock for a color
  const bulkUpdateStock = useCallback((color: string, stock: number) => {
    onChange(variants.map(v => v.color === color ? { ...v, stock } : v))
  }, [variants, onChange])

  // Bulk update price delta for a size segment
  const bulkUpdatePriceDelta = useCallback((sizes: string[], delta: number) => {
    onChange(variants.map(v => sizes.includes(v.size) ? { ...v, priceDelta: delta } : v))
  }, [variants, onChange])

  // Duplicate a variant
  const duplicateVariant = useCallback((id: string) => {
    const source = variants.find(v => v.id === id)
    if (!source) return
    const newVariant: VariantRow = {
      ...source,
      id: crypto.randomUUID(),
      sku: generateSKU(productName, source.size, source.color) + '-CPY',
    }
    onChange([...variants, newVariant])
  }, [variants, productName, onChange])

  // Stats
  const totalStock = useMemo(() => variants.reduce((sum, v) => sum + v.stock, 0), [variants])
  const activeCount = useMemo(() => variants.filter(v => v.isActive).length, [variants])

  // Group by color for matrix view
  const groupedByColor = useMemo(() => {
    const map = new Map<string, VariantRow[]>()
    for (const v of variants) {
      const key = v.color || 'Default'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(v)
    }
    return Array.from(map.entries())
  }, [variants])

  const effectiveSizes = sizes.length > 0 ? sizes : ['FREE']

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: 'var(--portal-muted)' }}>
            <strong style={{ color: 'var(--portal-text)' }}>{variants.length}</strong> variants
          </span>
          <span style={{ color: 'var(--portal-muted)' }}>
            <strong className="text-green-400">{activeCount}</strong> active
          </span>
          <span style={{ color: 'var(--portal-muted)' }}>
            <strong style={{ color: 'var(--portal-text)' }}>{totalStock}</strong> total stock
          </span>
        </div>
        <button
          type="button"
          onClick={generateAll}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--portal-accent)] text-white hover:opacity-90 transition-opacity"
        >
          {variants.length > 0 ? 'Regenerate Matrix' : 'Generate All Variants'}
          {colors.length > 0 && sizes.length > 0 && (
            <span className="ml-1 opacity-70">({colors.length} × {sizes.length} = {colors.length * sizes.length})</span>
          )}
        </button>
      </div>

      {/* Bulk Operations */}
      {variants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {SIZE_SEGMENTS.map(seg => {
            const segSizes = seg.sizes.filter(s => effectiveSizes.includes(s))
            if (segSizes.length === 0) return null
            return (
              <div key={seg.label} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--portal-muted)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                <span>{seg.label}:</span>
                <input
                  type="number"
                  placeholder="+₹"
                  className="portal-input-sm w-14 text-center"
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0
                    bulkUpdatePriceDelta(segSizes, val)
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Matrix Grid View */}
      {variants.length > 0 && (
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--portal-border)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--portal-elevated)' }}>
                <th className="text-left px-3 py-2 font-medium sticky left-0" style={{ color: 'var(--portal-muted)', background: 'var(--portal-elevated)' }}>Color / Size</th>
                {effectiveSizes.map(size => (
                  <th key={size} className="text-center px-2 py-2 font-bold" style={{ color: 'var(--portal-text)' }}>
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedByColor.map(([colorName, rows]) => {
                const colorHex = rows[0]?.colorHex
                return (
                  <tr key={colorName} style={{ borderTop: '1px solid var(--portal-border)' }}>
                    <td className="px-3 py-2 sticky left-0" style={{ background: 'var(--portal-surface)' }}>
                      <div className="flex items-center gap-2">
                        {colorHex && <span className="w-3 h-3 rounded-full border border-white/20" style={{ background: colorHex }} />}
                        <span className="font-medium" style={{ color: 'var(--portal-text)' }}>{colorName}</span>
                        <input
                          type="number"
                          placeholder="Bulk stock"
                          className="portal-input-sm w-16 text-center ml-auto"
                          onChange={e => bulkUpdateStock(colorName, parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    {effectiveSizes.map(size => {
                      const variant = rows.find(r => r.size === size)
                      if (!variant) return <td key={size} className="px-2 py-2 text-center" style={{ color: 'var(--portal-muted)' }}>—</td>
                      return (
                        <td key={size} className="px-1 py-1 text-center">
                          <div className={`p-1.5 rounded-lg space-y-1 ${variant.isActive ? '' : 'opacity-40'}`} style={{ background: 'var(--portal-elevated)' }}>
                            <input
                              value={variant.stock}
                              onChange={e => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                              className="portal-input-sm w-full text-center font-mono"
                              type="number"
                              title="Stock"
                            />
                            <input
                              value={variant.priceDelta || ''}
                              onChange={e => updateVariant(variant.id, 'priceDelta', parseFloat(e.target.value) || 0)}
                              className="portal-input-sm w-full text-center font-mono"
                              type="number"
                              placeholder="+₹0"
                              title="Price Delta"
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detailed List View */}
      {variants.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium px-3 py-2 rounded-lg hover:bg-[var(--portal-elevated)] transition-colors" style={{ color: 'var(--portal-muted)' }}>
            Detailed Variant List (SKUs, Weights) ▸
          </summary>
          <div className="mt-2 overflow-x-auto rounded-xl" style={{ border: '1px solid var(--portal-border)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--portal-elevated)' }}>
                  {['Active', 'SKU', 'Color', 'Size', 'Price Δ', 'Weight (g)', 'Stock', ''].map(h => (
                    <th key={h} className="text-left px-2 py-2 font-medium" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--portal-border)' }} className={!v.isActive ? 'opacity-40' : ''}>
                    <td className="px-2 py-1.5">
                      <input type="checkbox" checked={v.isActive} onChange={e => updateVariant(v.id, 'isActive', e.target.checked)} className="rounded" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={v.sku} onChange={e => updateVariant(v.id, 'sku', e.target.value)} className="portal-input-sm w-36 font-mono" />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        {v.colorHex && <span className="w-3 h-3 rounded-full" style={{ background: v.colorHex }} />}
                        <span style={{ color: 'var(--portal-text)' }}>{v.color}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5" style={{ color: 'var(--portal-text)' }}>{v.size}</td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={v.priceDelta || ''} onChange={e => updateVariant(v.id, 'priceDelta', parseFloat(e.target.value) || 0)} className="portal-input-sm w-16" placeholder="+₹0" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={v.weight ?? ''} onChange={e => updateVariant(v.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)} className="portal-input-sm w-16" placeholder="g" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" value={v.stock} onChange={e => updateVariant(v.id, 'stock', parseInt(e.target.value) || 0)} className="portal-input-sm w-14" />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => duplicateVariant(v.id)} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--portal-muted)' }} title="Duplicate">
                          <Copy size={11} />
                        </button>
                        <button type="button" onClick={() => removeVariant(v.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400" title="Remove">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Empty State */}
      {variants.length === 0 && (
        <div className="p-8 text-center rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
          <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>
            Select colors and sizes above, then click <strong>"Generate All Variants"</strong> to create the variant matrix.
          </p>
        </div>
      )}
    </div>
  )
}
