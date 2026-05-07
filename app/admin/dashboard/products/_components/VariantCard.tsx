'use client'
import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { ChevronDown, ChevronUp, Trash2, Copy, Plus, X, GripVertical, Truck } from 'lucide-react'
import { ImageUploader, UploadedImage } from '@/components/portal/products/ImageUploader'
import { SectionCard, Field } from './BasicInfoSection'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export interface WarehouseEntry {
  warehouseId: string
  warehouseName: string
  city: string
  quantity: number
}

export interface SizeQuantity {
  size: string
  quantity: number
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
  inventory: WarehouseEntry[]
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

  // Total stock across all sizes
  const totalStock = useMemo(() => variant.sizeQuantities.reduce((s, sq) => s + sq.quantity, 0), [variant.sizeQuantities])

  // Update size quantity
  const updateSizeQty = useCallback((size: string, qty: number) => {
    const existing = variant.sizeQuantities.find(sq => sq.size === size)
    if (existing) {
      set('sizeQuantities', variant.sizeQuantities.map(sq => sq.size === size ? { ...sq, quantity: qty } : sq))
    } else {
      set('sizeQuantities', [...variant.sizeQuantities, { size, quantity: qty }])
    }
  }, [variant.sizeQuantities, set])

  // Get qty for a size
  const getQty = useCallback((size: string) => {
    return variant.sizeQuantities.find(sq => sq.size === size)?.quantity || 0
  }, [variant.sizeQuantities])

  // Warehouse inventory
  const addWarehouse = useCallback(() => {
    if (!warehouses?.length) return
    const usedIds = variant.inventory.map(i => i.warehouseId)
    const available = warehouses.filter((w: any) => !usedIds.includes(w.id))
    if (!available.length) return
    const w = available[0]
    set('inventory', [...variant.inventory, { warehouseId: w.id, warehouseName: w.name, city: w.city || w.name, quantity: 0 }])
  }, [warehouses, variant.inventory, set])

  const updateWarehouse = useCallback((warehouseId: string, qty: number) => {
    set('inventory', variant.inventory.map(i => i.warehouseId === warehouseId ? { ...i, quantity: qty } : i))
  }, [variant.inventory, set])

  const removeWarehouse = useCallback((warehouseId: string) => {
    set('inventory', variant.inventory.filter(i => i.warehouseId !== warehouseId))
  }, [variant.inventory, set])

  const changeWarehouse = useCallback((oldId: string, newId: string) => {
    if (!warehouses) return
    const w = warehouses.find((x: any) => x.id === newId)
    if (!w) return
    set('inventory', variant.inventory.map(i => i.warehouseId === oldId ? { ...i, warehouseId: newId, warehouseName: w.name, city: w.city || w.name } : i))
  }, [warehouses, variant.inventory, set])

  const warehouseTotalStock = useMemo(() => variant.inventory.reduce((s, i) => s + i.quantity, 0), [variant.inventory])

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

          {/* ══ Size × Quantity Grid ══ */}
          <div className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>
              Size-wise Quantity
              <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--portal-muted)' }}>Total: {totalStock} units</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {sizes.map(size => (
                <div key={size} className="flex flex-col items-center gap-1 p-2 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--portal-text)' }}>{size}</span>
                  <input
                    type="number"
                    value={getQty(size) || ''}
                    onChange={e => updateSizeQty(size, parseInt(e.target.value) || 0)}
                    min={0}
                    placeholder="0"
                    className="w-full text-center text-xs font-mono rounded-lg px-1 py-1.5 border-0 outline-none"
                    style={{ background: 'var(--portal-surface)', color: 'var(--portal-text)' }}
                  />
                </div>
              ))}
            </div>
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

          {/* Warehouse Inventory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>
                <Truck size={12} className="inline mr-1" /> Warehouse Inventory
                <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--portal-muted)' }}>Total: {warehouseTotalStock}</span>
              </p>
              <button type="button" onClick={addWarehouse} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border border-dashed border-[var(--portal-border)] hover:border-[var(--portal-accent)] transition-colors" style={{ color: 'var(--portal-muted)' }}>
                <Plus size={10} /> Add Location
              </button>
            </div>

            {variant.inventory.length === 0 ? (
              <p className="text-[10px] p-3 rounded-lg text-center" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>
                No warehouse locations added yet.
              </p>
            ) : (
              <div className="space-y-2">
                {variant.inventory.map((inv, i) => (
                  <div key={inv.warehouseId} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
                    <span className="text-[10px] w-4 text-center font-mono" style={{ color: 'var(--portal-muted)' }}>{i === 0 ? '★' : i + 1}</span>
                    <select
                      value={inv.warehouseId}
                      onChange={e => changeWarehouse(inv.warehouseId, e.target.value)}
                      className="portal-input-sm flex-1"
                    >
                      {warehouses?.map((w: any) => (
                        <option key={w.id} value={w.id}>{w.name} ({w.city || w.state || ''})</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Qty:</span>
                      <input type="number" value={inv.quantity} onChange={e => updateWarehouse(inv.warehouseId, parseInt(e.target.value) || 0)} className="portal-input-sm w-16 text-center font-mono" min={0} />
                    </div>
                    <button type="button" onClick={() => removeWarehouse(inv.warehouseId)} className="p-1 rounded hover:bg-red-500/10 text-red-400"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
