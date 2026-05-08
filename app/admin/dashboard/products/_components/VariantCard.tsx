'use client'
import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { ChevronDown, ChevronUp, Trash2, Copy, Plus, X, GripVertical, MapPin } from 'lucide-react'
import { ImageUploader, UploadedImage } from '@/components/portal/products/ImageUploader'
import { SectionCard, Field } from './BasicInfoSection'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export interface WarehouseEntry {
  warehouseId: string
  quantity: number
}

export interface SizeQuantity {
  size: string
  warehouses: WarehouseEntry[]
}

export interface VariantFormValues {
  _localId: string
  colorName: string
  colorHex: string
  sku: string
  price: string
  compareAtPrice: string
  costPrice: string
  barcode: string
  weight: string
  images: UploadedImage[]
  sizeQuantities: SizeQuantity[]
  isActive: boolean
}

interface VariantCardProps {
  variant: VariantFormValues
  index: number
  productSlug: string
  sizes: string[]
  onChange: (variant: VariantFormValues) => void
  onRemove: () => void
  onDuplicate: () => void
  defaultExpanded?: boolean
}

export function VariantCard({ variant, index, productSlug, sizes, onChange, onRemove, onDuplicate, defaultExpanded = false }: VariantCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { data: warehouses } = useSWR('/api/portal/shipping/warehouses', fetcher)

  const set = useCallback(<K extends keyof VariantFormValues>(key: K, val: VariantFormValues[K]) => {
    onChange({ ...variant, [key]: val })
  }, [variant, onChange])

  // Auto SKU prefix: SLUG-COLOR
  const autoSkuPrefix = useMemo(() => {
    const slug = productSlug.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()
    const color = variant.colorName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
    return `${slug}-${color}`
  }, [productSlug, variant.colorName])

  // Margin calc
  const margin = useMemo(() => {
    const p = parseFloat(variant.price)
    const c = parseFloat(variant.costPrice)
    if (!p || !c) return null
    return Math.round((p - c) / p * 100)
  }, [variant.price, variant.costPrice])

  const profit = useMemo(() => {
    const p = parseFloat(variant.price)
    const c = parseFloat(variant.costPrice)
    if (!p || !c) return null
    return (p - c).toFixed(0)
  }, [variant.price, variant.costPrice])

  const discount = useMemo(() => {
    const cp = parseFloat(variant.compareAtPrice)
    const p = parseFloat(variant.price)
    if (!cp || !p || p >= cp) return null
    return Math.round((1 - p / cp) * 100)
  }, [variant.price, variant.compareAtPrice])

  // Total stock across all sizes and warehouses
  const totalStock = useMemo(() =>
    variant.sizeQuantities.reduce((s, sq) => s + sq.warehouses.reduce((ws, w) => ws + w.quantity, 0), 0),
    [variant.sizeQuantities]
  )

  const warehouseOptions = useMemo(() => Array.isArray(warehouses) ? warehouses : [], [warehouses])

  const resolveWarehouse = useCallback((warehouseId?: string) => {
    if (!warehouseId) return null
    return warehouseOptions.find((w: any) => w.id === warehouseId) || null
  }, [warehouseOptions])

  // Total warehouse entries across all sizes
  const totalWarehouseEntries = useMemo(() =>
    variant.sizeQuantities.reduce((s, sq) => s + sq.warehouses.length, 0),
    [variant.sizeQuantities]
  )

  // Get/ensure size row exists
  const getSizeRow = useCallback((size: string): SizeQuantity => {
    return variant.sizeQuantities.find(sq => sq.size === size) || { size, warehouses: [] }
  }, [variant.sizeQuantities])

  // Update a size row's warehouses
  const updateSizeWarehouses = useCallback((size: string, warehouses: WarehouseEntry[]) => {
    const exists = variant.sizeQuantities.find(sq => sq.size === size)
    if (exists) {
      set('sizeQuantities', variant.sizeQuantities.map(sq =>
        sq.size === size ? { ...sq, warehouses } : sq
      ))
    } else {
      set('sizeQuantities', [...variant.sizeQuantities, { size, warehouses }])
    }
  }, [variant.sizeQuantities, set])

  // Add a warehouse entry to a size
  const addWarehouseToSize = useCallback((size: string) => {
    const row = getSizeRow(size)
    updateSizeWarehouses(size, [...row.warehouses, { warehouseId: '', quantity: 0 }])
  }, [getSizeRow, updateSizeWarehouses])

  // Remove a warehouse entry from a size
  const removeWarehouseFromSize = useCallback((size: string, idx: number) => {
    const row = getSizeRow(size)
    updateSizeWarehouses(size, row.warehouses.filter((_, i) => i !== idx))
  }, [getSizeRow, updateSizeWarehouses])

  // Update a warehouse entry within a size
  const updateWarehouseEntry = useCallback((size: string, idx: number, patch: Partial<WarehouseEntry>) => {
    const row = getSizeRow(size)
    updateSizeWarehouses(size, row.warehouses.map((w, i) => i === idx ? { ...w, ...patch } : w))
  }, [getSizeRow, updateSizeWarehouses])

  // Validate: every warehouse entry with qty > 0 must have a warehouseId
  const validateWarehouseSelection = useCallback(() => {
    return variant.sizeQuantities.every(sq =>
      sq.warehouses.every(w => w.quantity <= 0 || !!w.warehouseId)
    )
  }, [variant.sizeQuantities])

  return (
    <div className="rounded-2xl overflow-hidden transition-all" style={{ background: 'var(--portal-surface)', border: `1px solid ${variant.isActive ? 'var(--portal-border)' : 'rgba(239,68,68,0.3)'}` }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-[var(--portal-elevated)]/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical size={14} style={{ color: 'var(--portal-muted)' }} className="flex-shrink-0 cursor-grab" />
        <span className="w-7 h-7 rounded-full border-2 border-white/20 flex-shrink-0 shadow-sm" style={{ background: variant.colorHex || '#888' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--portal-text)' }}>
            {variant.colorName || 'Unnamed Color'}
          </p>
          <p className="text-[10px] font-mono truncate" style={{ color: 'var(--portal-muted)' }}>
            {autoSkuPrefix} • {sizes.length} sizes • Stock: {totalStock} • {variant.price ? `₹${variant.price}` : 'No price'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {!variant.isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">Inactive</span>}
          {discount && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">{discount}% off</span>}
          <button type="button" onClick={e => { e.stopPropagation(); onDuplicate() }} className="p-1 rounded hover:bg-white/5" style={{ color: 'var(--portal-muted)' }} title="Duplicate"><Copy size={12} /></button>
          <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="p-1 rounded hover:bg-red-500/10 text-red-400" title="Remove"><Trash2 size={12} /></button>
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--portal-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--portal-muted)' }} />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-5" style={{ borderTop: '1px solid var(--portal-border)' }}>
          {/* SKU + Active */}
          <div className="flex items-end gap-3 pt-4">
            <Field label="SKU Prefix">
              <div className="flex gap-2">
                <input value={variant.sku} onChange={e => set('sku', e.target.value)} placeholder={autoSkuPrefix} className="portal-input flex-1 font-mono" />
                <button type="button" onClick={() => set('sku', autoSkuPrefix)} className="px-2 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>Auto</button>
              </div>
            </Field>
            <label className="flex items-center gap-2 pb-1 cursor-pointer">
              <input type="checkbox" checked={variant.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded accent-[var(--portal-accent)]" />
              <span className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>Active</span>
            </label>
          </div>

          {/* ══ Size × Multi-Warehouse Inventory ══ */}
          <div className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>
              Size-wise Inventory
              <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--portal-muted)' }}>Total: {totalStock} units across {totalWarehouseEntries} warehouse locations</span>
            </p>
            <div className="space-y-3">
              {sizes.map(size => {
                const row = getSizeRow(size)
                const sizeTotal = row.warehouses.reduce((s, w) => s + w.quantity, 0)
                return (
                  <div key={size} className="p-3 rounded-xl space-y-2" style={{ background: 'var(--portal-elevated)' }}>
                    {/* Size header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: 'var(--portal-surface)', color: 'var(--portal-text)' }}>{size}</span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>{sizeTotal} units total</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addWarehouseToSize(size)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors hover:bg-[var(--portal-accent)]/10"
                        style={{ color: 'var(--portal-accent)', border: '1px dashed var(--portal-border)' }}
                      >
                        <Plus size={10} /> Add Warehouse
                      </button>
                    </div>

                    {/* Warehouse entries for this size */}
                    {row.warehouses.length === 0 && (
                      <p className="text-[10px] py-2 text-center" style={{ color: 'var(--portal-muted)' }}>
                        No warehouse locations added. Click "Add Warehouse" to assign stock.
                      </p>
                    )}
                    {row.warehouses.map((wEntry, wIdx) => {
                      const wh = resolveWarehouse(wEntry.warehouseId)
                      // Already-used warehouse IDs for this size (exclude current row)
                      const usedIds = row.warehouses.filter((_, i) => i !== wIdx).map(w => w.warehouseId)
                      return (
                        <div key={wIdx} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_100px_28px] gap-2 p-2 rounded-lg items-end" style={{ background: 'var(--portal-surface)' }}>
                          <div className="space-y-1">
                            <label className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Warehouse location</label>
                            <select
                              value={wEntry.warehouseId}
                              onChange={e => updateWarehouseEntry(size, wIdx, { warehouseId: e.target.value })}
                              className="portal-input-sm w-full"
                            >
                              <option value="">Select warehouse</option>
                              {warehouseOptions.map((w: any) => (
                                <option key={w.id} value={w.id} disabled={usedIds.includes(w.id)}>
                                  {w.name}{w.city ? ` — ${w.city}` : ''}{w.pincode ? ` (${w.pincode})` : ''}
                                </option>
                              ))}
                            </select>
                            {wh && (
                              <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--portal-muted)' }}>
                                <MapPin size={8} />
                                {[wh.city, wh.state, wh.pincode].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Qty</label>
                            <input
                              type="number"
                              value={wEntry.quantity || ''}
                              onChange={e => updateWarehouseEntry(size, wIdx, { quantity: parseInt(e.target.value) || 0 })}
                              min={0}
                              placeholder="0"
                              className="portal-input-sm w-full text-center font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeWarehouseFromSize(size, wIdx)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 self-end mb-0.5"
                            title="Remove warehouse"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            {!validateWarehouseSelection() && (
              <p className="text-[10px] text-amber-400">
                Please select a warehouse for every entry that has stock greater than 0.
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Selling Price ₹" required>
              <input type="number" value={variant.price} onChange={e => set('price', e.target.value)} placeholder="1499" className="portal-input" />
            </Field>
            <Field label="Compare At ₹" hint="Strikethrough">
              <input type="number" value={variant.compareAtPrice} onChange={e => set('compareAtPrice', e.target.value)} placeholder="1999" className="portal-input" />
            </Field>
            <Field label="Cost Price ₹" hint="For reports">
              <input type="number" value={variant.costPrice} onChange={e => set('costPrice', e.target.value)} placeholder="600" className="portal-input" />
            </Field>
            <Field label="Weight (g)" hint="For shipping">
              <input type="number" value={variant.weight} onChange={e => set('weight', e.target.value)} placeholder="350" className="portal-input" />
            </Field>
          </div>

          {/* Margin indicator */}
          {(margin !== null || discount !== null) && (
            <div className="flex gap-4 p-2.5 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
              {discount !== null && <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Discount: <strong className="text-green-400">{discount}%</strong></span>}
              {margin !== null && <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Margin: <strong className="text-blue-400">{margin}%</strong></span>}
              {profit !== null && <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Profit: <strong className="text-purple-400">₹{profit}</strong></span>}
            </div>
          )}

          {/* Variant Images */}
          <div className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>Images for {variant.colorName || 'this color'}</p>
            <ImageUploader
              images={variant.images}
              onChange={imgs => set('images', imgs)}
              maxImages={8}
              folder={`products/${productSlug}/variants/${(variant.sku || autoSkuPrefix).toLowerCase()}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
