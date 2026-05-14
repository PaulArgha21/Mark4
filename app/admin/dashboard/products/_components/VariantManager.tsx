'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { Plus, Layers, Zap } from 'lucide-react'
import { ColorPicker, ColorOption } from '@/components/portal/products/ColorPicker'
import { SizeSelector, SizeType } from '@/components/portal/products/SizeSelector'
import { VariantCard, VariantFormValues } from './VariantCard'
import { SectionCard } from './BasicInfoSection'

interface VariantManagerProps {
  variants: VariantFormValues[]
  onChange: (variants: VariantFormValues[]) => void
  productSlug: string
  onSaveVariant?: (variant: VariantFormValues) => Promise<void>
}

function generateSkuPrefix(slug: string, color: string): string {
  const prefix = slug.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()
  const c = color.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
  return `${prefix}-${c}`
}

function makeColorVariant(slug: string, color: ColorOption, sizes: string[]): VariantFormValues {
  return {
    _localId: crypto.randomUUID(),
    colorName: color.name,
    colorHex: color.hex,
    sku: generateSkuPrefix(slug, color.name),
    price: '',
    compareAtPrice: '',
    costPrice: '',
    barcode: '',
    weight: '',
    images: [],
    sizeQuantities: sizes.map(s => ({ size: s, warehouses: [] })),
    isActive: true,
  }
}

export function VariantManager({ variants, onChange, productSlug, onSaveVariant }: VariantManagerProps) {
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [sizeType, setSizeType] = useState<SizeType>('clothing')

  const existingColors = useMemo(() => {
    const map = new Map<string, ColorOption>()
    for (const v of variants) {
      if (!map.has(v.colorName)) {
        map.set(v.colorName, { name: v.colorName, hex: v.colorHex || '#000000' })
      }
    }
    return Array.from(map.values())
  }, [variants])

  const existingSizes = useMemo(() => {
    const set = new Set<string>()
    for (const v of variants) {
      for (const sq of v.sizeQuantities) set.add(sq.size)
    }
    return Array.from(set)
  }, [variants])

  // Active sizes list
  const activeSizes = useMemo(() => {
    if (sizeType === 'free') return ['FREE']
    const sizes = selectedSizes.length > 0 ? selectedSizes : existingSizes
    return sizes.length > 0 ? sizes : ['FREE']
  }, [sizeType, selectedSizes, existingSizes])

  const activeColors = useMemo(() => {
    const colors = selectedColors.length > 0 ? selectedColors : existingColors
    return colors.length > 0 ? colors : [{ name: 'Default', hex: '#000000' }]
  }, [selectedColors, existingColors])

  useEffect(() => {
    if (variants.length === 0) return
    if (selectedColors.length === 0 && existingColors.length > 0) {
      setSelectedColors(existingColors)
    }
    if (selectedSizes.length === 0 && existingSizes.length > 0) {
      setSelectedSizes(existingSizes)
    }
  }, [variants.length, existingColors, existingSizes, selectedColors.length, selectedSizes.length])

  // Generate one card per color
  const generateVariants = useCallback(() => {
    const generated: VariantFormValues[] = []
    for (const color of activeColors) {
      // Preserve existing variant for this color
      const existing = variants.find(v => v.colorName === color.name)
      if (existing) {
        // Preserve current size rows and merge in any new sizes without losing warehouse selections
        const existingSizesForColor = existing.sizeQuantities.map(sq => sq.size)
        const newSizeQtys = [...existing.sizeQuantities]
        for (const s of activeSizes) {
          if (!existingSizesForColor.includes(s)) {
            newSizeQtys.push({ size: s, warehouses: [] })
          }
        }
        generated.push({ ...existing, sizeQuantities: newSizeQtys })
      } else {
        generated.push(makeColorVariant(productSlug, color, activeSizes))
      }
    }
    // Keep any colors that already exist but are not in the current selection, so regenerate never drops data accidentally.
    for (const existing of variants) {
      if (!generated.some(v => v.colorName === existing.colorName)) {
        generated.push(existing)
      }
    }
    onChange(generated)
  }, [activeColors, activeSizes, productSlug, variants, onChange])

  // Single add (blank color)
  const addBlankVariant = useCallback(() => {
    const v = makeColorVariant(productSlug, { name: '', hex: '#000000' }, activeSizes)
    onChange([...variants, v])
  }, [productSlug, activeSizes, variants, onChange])

  // Update single
  const updateVariant = useCallback((localId: string, updated: VariantFormValues) => {
    onChange(variants.map(v => v._localId === localId ? updated : v))
  }, [variants, onChange])

  // Remove
  const removeVariant = useCallback((localId: string) => {
    onChange(variants.filter(v => v._localId !== localId))
  }, [variants, onChange])

  // Duplicate
  const duplicateVariant = useCallback((localId: string) => {
    const source = variants.find(v => v._localId === localId)
    if (!source) return
    const dup: VariantFormValues = {
      ...source,
      _localId: crypto.randomUUID(),
      colorName: source.colorName + ' Copy',
      sku: source.sku + '-COPY',
      images: [],
      sizeQuantities: source.sizeQuantities.map(sq => ({ ...sq, warehouses: [] })),
    }
    const idx = variants.findIndex(v => v._localId === localId)
    const next = [...variants]
    next.splice(idx + 1, 0, dup)
    onChange(next)
  }, [variants, onChange])

  // Bulk pricing
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkCompare, setBulkCompare] = useState('')
  const [bulkCost, setBulkCost] = useState('')
  const applyBulkPricing = useCallback(() => {
    onChange(variants.map(v => ({
      ...v,
      price: bulkPrice || v.price,
      compareAtPrice: bulkCompare || v.compareAtPrice,
      costPrice: bulkCost || v.costPrice,
    })))
  }, [variants, bulkPrice, bulkCompare, bulkCost, onChange])

  // Stats
  const totalStock = useMemo(() => variants.reduce((s, v) => s + v.sizeQuantities.reduce((ss, sq) => ss + sq.warehouses.reduce((ws, w) => ws + w.quantity, 0), 0), 0), [variants])
  const activeCount = useMemo(() => variants.filter(v => v.isActive).length, [variants])

  return (
    <div className="space-y-6">
      {/* ── Step 1: Colors ── */}
      <SectionCard title="Step 1 — Select Colors">
        <p className="text-[10px] mb-2" style={{ color: 'var(--portal-muted)' }}>
          Each color you select becomes one variant card. Upload images and set quantities per size inside each card.
        </p>
        <ColorPicker selected={selectedColors} onChange={setSelectedColors} />
      </SectionCard>

      {/* ── Step 2: Sizes ── */}
      <SectionCard title="Step 2 — Select Sizes">
        <p className="text-[10px] mb-2" style={{ color: 'var(--portal-muted)' }}>
          Choose available sizes. All sizes will appear inside every color variant card for quantity input.
        </p>
        <SizeSelector sizeType={sizeType} selected={selectedSizes} onChange={setSelectedSizes} onSizeTypeChange={setSizeType} />
      </SectionCard>

      {/* ── Generate Button ── */}
      <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
        <div className="flex items-center gap-4 text-xs">
          <span style={{ color: 'var(--portal-muted)' }}>
            Colors: <strong style={{ color: 'var(--portal-text)' }}>{selectedColors.length || 1}</strong>
          </span>
          <span style={{ color: 'var(--portal-muted)' }}>•</span>
          <span style={{ color: 'var(--portal-muted)' }}>
            Sizes per color: <strong style={{ color: 'var(--portal-text)' }}>{activeSizes.length}</strong>
          </span>
          <span style={{ color: 'var(--portal-muted)' }}>=</span>
          <span className="text-sm font-bold" style={{ color: 'var(--portal-accent)' }}>{selectedColors.length || 1} color variant{(selectedColors.length || 1) > 1 ? 's' : ''}</span>
        </div>
        <button
          type="button"
          onClick={generateVariants}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: 'var(--portal-accent)' }}
        >
          <Zap size={14} />
          {variants.length > 0 ? 'Regenerate' : 'Generate'} Variants
        </button>
      </div>

      {/* ── Bulk Pricing ── */}
      {variants.length > 0 && (
        <SectionCard title="Bulk Pricing (apply to all colors)">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <label className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Selling ₹</label>
              <input type="number" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="1499" className="portal-input-sm w-24" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Compare At ₹</label>
              <input type="number" value={bulkCompare} onChange={e => setBulkCompare(e.target.value)} placeholder="1999" className="portal-input-sm w-24" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Cost ₹</label>
              <input type="number" value={bulkCost} onChange={e => setBulkCost(e.target.value)} placeholder="600" className="portal-input-sm w-24" />
            </div>
            <button type="button" onClick={applyBulkPricing} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}>
              Apply to All
            </button>
          </div>
        </SectionCard>
      )}

      {/* ── Stats ── */}
      {variants.length > 0 && (
        <div className="flex items-center gap-6 px-4 py-2 text-[10px]" style={{ color: 'var(--portal-muted)' }}>
          <span><Layers size={10} className="inline mr-1" /><strong style={{ color: 'var(--portal-text)' }}>{variants.length}</strong> color variants</span>
          <span><strong className="text-green-400">{activeCount}</strong> active</span>
          <span><strong style={{ color: 'var(--portal-text)' }}>{totalStock}</strong> total stock (all sizes)</span>
        </div>
      )}

      {/* ── Variant Cards (one per color) ── */}
      <div className="space-y-3">
        {variants.map((v, i) => (
          <VariantCard
            key={v._localId}
            variant={v}
            index={i}
            productSlug={productSlug}
            sizes={activeSizes}
            onChange={updated => updateVariant(v._localId, updated)}
            onRemove={() => removeVariant(v._localId)}
            onDuplicate={() => duplicateVariant(v._localId)}
            onSave={onSaveVariant ? () => onSaveVariant(v) : undefined}
            defaultExpanded={variants.length === 1}
          />
        ))}
      </div>

      {/* ── Add Manual Color Variant ── */}
      <button
        type="button"
        onClick={addBlankVariant}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed transition-all hover:border-[var(--portal-accent)] hover:bg-[var(--portal-accent)]/5"
        style={{ borderColor: 'var(--portal-border)', color: 'var(--portal-muted)' }}
      >
        <Plus size={14} /> Add Color Variant
      </button>
    </div>
  )
}
