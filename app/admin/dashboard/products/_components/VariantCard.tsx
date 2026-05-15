'use client'
import { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown, ChevronUp, Trash2, Copy, Plus, X, GripVertical,
  MapPin, Package, TrendingUp, Tag, Warehouse, Save, Loader2, Eye, EyeOff,
  IndianRupee, Weight, BarChart3, ImagePlus,
} from 'lucide-react'
import { ImageUploader, UploadedImage } from '@/components/portal/products/ImageUploader'

export interface WarehouseEntry {
  warehouseId: string
  warehouseName: string
  pincode: string
  quantity: number
}

export interface SizeQuantity {
  size: string
  variantId?: string
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
  onSave?: () => Promise<void>
  defaultExpanded?: boolean
}

/* ── Small reusable sub-components ── */

function MetricBadge({ icon: Icon, label, value, color = 'var(--portal-text)' }: {
  icon: React.ElementType; label: string; value: string | number; color?: string
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
      <Icon size={11} style={{ color, opacity: 0.7 }} />
      <span className="text-[9px] uppercase tracking-wider font-medium" style={{ color: 'var(--portal-muted)' }}>{label}</span>
      <span className="text-[11px] font-bold font-mono ml-auto" style={{ color }}>{value}</span>
    </div>
  )
}

function InputField({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>
          {label}
          {required && <span className="text-rose-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[9px]" style={{ color: 'var(--portal-muted)', opacity: 0.6 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function VariantCard({ variant, index, productSlug, sizes, onChange, onRemove, onDuplicate, onSave, defaultExpanded = false }: VariantCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'pricing' | 'images'>('inventory')

  const set = useCallback(<K extends keyof VariantFormValues>(key: K, val: VariantFormValues[K]) => {
    onChange({ ...variant, [key]: val })
  }, [variant, onChange])

  const autoSkuPrefix = useMemo(() => {
    const slug = productSlug.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()
    const color = variant.colorName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
    return `${slug}-${color}`
  }, [productSlug, variant.colorName])

  const margin = useMemo(() => {
    const p = parseFloat(variant.price); const c = parseFloat(variant.costPrice)
    if (!p || !c) return null; return Math.round((p - c) / p * 100)
  }, [variant.price, variant.costPrice])

  const profit = useMemo(() => {
    const p = parseFloat(variant.price); const c = parseFloat(variant.costPrice)
    if (!p || !c) return null; return (p - c).toFixed(0)
  }, [variant.price, variant.costPrice])

  const discount = useMemo(() => {
    const cp = parseFloat(variant.compareAtPrice); const p = parseFloat(variant.price)
    if (!cp || !p || p >= cp) return null; return Math.round((1 - p / cp) * 100)
  }, [variant.price, variant.compareAtPrice])

  const totalStock = useMemo(() =>
    variant.sizeQuantities.reduce((s, sq) => s + sq.warehouses.reduce((ws, w) => ws + w.quantity, 0), 0),
    [variant.sizeQuantities])

  const totalWarehouseEntries = useMemo(() =>
    variant.sizeQuantities.reduce((s, sq) => s + sq.warehouses.length, 0),
    [variant.sizeQuantities])

  const getSizeRow = useCallback((size: string): SizeQuantity => {
    return variant.sizeQuantities.find(sq => sq.size === size) || { size, warehouses: [] }
  }, [variant.sizeQuantities])

  const updateSizeWarehouses = useCallback((size: string, warehouses: WarehouseEntry[]) => {
    const exists = variant.sizeQuantities.find(sq => sq.size === size)
    if (exists) {
      set('sizeQuantities', variant.sizeQuantities.map(sq => sq.size === size ? { ...sq, warehouses } : sq))
    } else {
      set('sizeQuantities', [...variant.sizeQuantities, { size, warehouses }])
    }
  }, [variant.sizeQuantities, set])

  const addWarehouseToSize = useCallback((size: string) => {
    const row = getSizeRow(size)
    updateSizeWarehouses(size, [...row.warehouses, { warehouseId: '', warehouseName: '', pincode: '', quantity: 0 }])
  }, [getSizeRow, updateSizeWarehouses])

  const removeWarehouseFromSize = useCallback((size: string, idx: number) => {
    const row = getSizeRow(size)
    updateSizeWarehouses(size, row.warehouses.filter((_, i) => i !== idx))
  }, [getSizeRow, updateSizeWarehouses])

  const updateWarehouseEntry = useCallback((size: string, idx: number, patch: Partial<WarehouseEntry>) => {
    const row = getSizeRow(size)
    updateSizeWarehouses(size, row.warehouses.map((w, i) => i === idx ? { ...w, ...patch } : w))
  }, [getSizeRow, updateSizeWarehouses])

  const validateWarehouseSelection = useCallback(() => {
    return variant.sizeQuantities.every(sq =>
      sq.warehouses.every(w => w.quantity <= 0 || (!!w.warehouseName.trim() && /^\d{6}$/.test(w.pincode)))
    )
  }, [variant.sizeQuantities])

  const handleSaveVariant = useCallback(async () => {
    if (!onSave) return
    setSaving(true)
    try { await onSave() } finally { setSaving(false) }
  }, [onSave])

  const isValid = !!variant.sku && !!variant.price && validateWarehouseSelection()

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--portal-surface)',
        border: `1px solid ${!variant.isActive ? 'rgba(239,68,68,0.35)' : expanded ? 'var(--portal-accent)' : 'var(--portal-border)'}`,
        boxShadow: expanded ? '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(214,51,108,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors"
        style={{ background: expanded ? 'rgba(214,51,108,0.03)' : 'transparent' }}
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical size={14} style={{ color: 'var(--portal-muted)', opacity: 0.5 }} className="flex-shrink-0 cursor-grab" />

        {/* Color swatch — click to change color without expanding */}
        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
          <label className="block w-9 h-9 rounded-xl shadow-md cursor-pointer overflow-hidden"
            style={{
              background: variant.colorHex || '#888',
              border: '2px solid rgba(255,255,255,0.1)',
              boxShadow: `0 2px 8px ${variant.colorHex || '#888'}40`,
            }}
            title="Click to change color"
          >
            <input
              type="color"
              value={variant.colorHex || '#000000'}
              onChange={e => set('colorHex', e.target.value)}
              className="opacity-0 absolute w-0 h-0"
            />
          </label>
          {!variant.isActive && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[var(--portal-surface)] flex items-center justify-center">
              <X size={7} className="text-white" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--portal-text)' }}>
              {variant.colorName || 'Unnamed Color'}
            </p>
            {!variant.isActive && (
              <span className="text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-red-500/15 text-red-400">Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>{variant.sku || autoSkuPrefix}</span>
            <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>•</span>
            <span className="text-[10px] font-medium" style={{ color: totalStock > 0 ? '#4ade80' : '#f87171' }}>
              {totalStock} in stock
            </span>
            {variant.price && (
              <>
                <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>•</span>
                <span className="text-[10px] font-semibold" style={{ color: 'var(--portal-text)' }}>₹{variant.price}</span>
              </>
            )}
            {discount !== null && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">{discount}% OFF</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onSave && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); handleSaveVariant() }}
              disabled={saving || !isValid}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-40"
              style={{ background: 'var(--portal-accent)', color: '#fff' }}
              title="Save this variant"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
              Save
            </button>
          )}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onDuplicate() }}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: 'var(--portal-muted)' }}
            title="Duplicate variant"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onRemove() }}
            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-400/70 hover:text-red-400"
            title="Remove variant"
          >
            <Trash2 size={13} />
          </button>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center ml-1" style={{ color: 'var(--portal-muted)' }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>
      </div>

      {/* ═══ EXPANDED BODY ═══ */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--portal-border)' }}>
          {/* ── Metric Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3" style={{ background: 'var(--portal-elevated)' }}>
            <MetricBadge icon={Package} label="Stock" value={totalStock} color={totalStock > 0 ? '#4ade80' : '#f87171'} />
            <MetricBadge icon={Warehouse} label="Warehouses" value={totalWarehouseEntries} />
            <MetricBadge icon={TrendingUp} label="Margin" value={margin !== null ? `${margin}%` : '—'} color={margin && margin > 30 ? '#4ade80' : margin && margin > 0 ? '#facc15' : 'var(--portal-muted)'} />
            <MetricBadge icon={IndianRupee} label="Profit" value={profit !== null ? `₹${profit}` : '—'} color={profit && Number(profit) > 0 ? '#a78bfa' : 'var(--portal-muted)'} />
          </div>

          {/* ── Config bar: Color + SKU + Active ── */}
          <div className="px-5 py-3 space-y-3" style={{ borderBottom: '1px solid var(--portal-border)' }}>
            {/* Color customization row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <InputField label="Color Name" required>
                  <input
                    value={variant.colorName}
                    onChange={e => set('colorName', e.target.value)}
                    placeholder="e.g. Midnight Blue"
                    className="portal-input text-sm"
                    style={{ background: 'var(--portal-elevated)' }}
                  />
                </InputField>
              </div>
              <div className="w-full sm:w-48">
                <InputField label="Color Hex">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={variant.colorHex || '#000000'}
                      onChange={e => set('colorHex', e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5"
                      style={{ background: 'var(--portal-elevated)' }}
                    />
                    <input
                      value={variant.colorHex || ''}
                      onChange={e => set('colorHex', e.target.value)}
                      placeholder="#000000"
                      className="portal-input flex-1 font-mono text-sm uppercase"
                      style={{ background: 'var(--portal-elevated)' }}
                      maxLength={7}
                    />
                  </div>
                </InputField>
              </div>
            </div>

            {/* SKU + Active row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <InputField label="SKU Prefix" required>
                  <div className="flex gap-2">
                    <input
                      value={variant.sku}
                      onChange={e => set('sku', e.target.value)}
                      placeholder={autoSkuPrefix}
                      className="portal-input flex-1 font-mono text-sm"
                      style={{ background: 'var(--portal-elevated)' }}
                    />
                    <button
                      type="button"
                      onClick={() => set('sku', autoSkuPrefix)}
                      className="px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all hover:opacity-80"
                      style={{ background: 'var(--portal-accent)', color: '#fff' }}
                    >
                      Auto
                    </button>
                  </div>
                </InputField>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !variant.isActive)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0"
                style={{
                  background: variant.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                  color: variant.isActive ? '#4ade80' : '#f87171',
                  border: `1px solid ${variant.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                }}
              >
                {variant.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                {variant.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>

          {/* ── Tabs: Inventory / Pricing / Images ── */}
          <div className="px-5 pt-3">
            <div className="flex gap-0.5 p-0.5 rounded-xl w-fit" style={{ background: 'var(--portal-elevated)' }}>
              {([
                { key: 'inventory' as const, icon: Warehouse, label: 'Inventory' },
                { key: 'pricing' as const, icon: Tag, label: 'Pricing' },
                { key: 'images' as const, icon: ImagePlus, label: 'Images' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: activeTab === tab.key ? 'var(--portal-surface)' : 'transparent',
                    color: activeTab === tab.key ? 'var(--portal-accent)' : 'var(--portal-muted)',
                    boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  <tab.icon size={12} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ═══ TAB: INVENTORY ═══ */}
          {activeTab === 'inventory' && (
            <div className="px-5 py-4 space-y-3">
              {sizes.map(size => {
                const row = getSizeRow(size)
                const sizeTotal = row.warehouses.reduce((s, w) => s + w.quantity, 0)
                return (
                  <div key={size} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--portal-border)' }}>
                    {/* Size header */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ background: 'var(--portal-elevated)' }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-bold px-3 py-1 rounded-lg"
                          style={{ background: 'var(--portal-accent)', color: '#fff', minWidth: 40, textAlign: 'center' }}
                        >
                          {size}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Package size={11} style={{ color: sizeTotal > 0 ? '#4ade80' : 'var(--portal-muted)' }} />
                          <span className="text-[11px] font-mono font-semibold" style={{ color: sizeTotal > 0 ? '#4ade80' : 'var(--portal-muted)' }}>
                            {sizeTotal} units
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addWarehouseToSize(size)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                        style={{
                          background: 'var(--portal-accent)',
                          color: '#fff',
                          boxShadow: '0 2px 8px rgba(214,51,108,0.2)',
                        }}
                      >
                        <Plus size={10} /> Warehouse
                      </button>
                    </div>

                    {/* Warehouse entries */}
                    <div className="divide-y" style={{ borderColor: 'var(--portal-border)' }}>
                      {row.warehouses.length === 0 && (
                        <div className="px-4 py-6 text-center" style={{ background: 'var(--portal-surface)' }}>
                          <Warehouse size={20} className="mx-auto mb-2" style={{ color: 'var(--portal-muted)', opacity: 0.4 }} />
                          <p className="text-[11px] font-medium" style={{ color: 'var(--portal-muted)' }}>
                            No warehouse assigned — click <strong>+ Warehouse</strong> to add stock
                          </p>
                        </div>
                      )}
                      {row.warehouses.map((wEntry, wIdx) => (
                        <div
                          key={wIdx}
                          className="grid grid-cols-[1fr] md:grid-cols-[1fr_140px_100px_36px] gap-3 px-4 py-3 items-end"
                          style={{ background: 'var(--portal-surface)' }}
                        >
                          <InputField label="Warehouse Location">
                            <input
                              type="text"
                              value={wEntry.warehouseName}
                              onChange={e => updateWarehouseEntry(size, wIdx, { warehouseName: e.target.value })}
                              placeholder="e.g. Mumbai Central Hub"
                              className="portal-input text-sm"
                              style={{ background: 'var(--portal-elevated)' }}
                            />
                          </InputField>
                          <InputField label="Pincode">
                            <div className="relative">
                              <input
                                type="text"
                                value={wEntry.pincode}
                                onChange={e => {
                                  const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                                  updateWarehouseEntry(size, wIdx, { pincode: v })
                                }}
                                placeholder="400001"
                                maxLength={6}
                                className="portal-input font-mono text-sm"
                                style={{ background: 'var(--portal-elevated)', paddingRight: 28 }}
                              />
                              {wEntry.pincode.length === 6 && (
                                <MapPin size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                              )}
                              {wEntry.pincode.length > 0 && wEntry.pincode.length < 6 && (
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-amber-400">
                                  {wEntry.pincode.length}/6
                                </span>
                              )}
                            </div>
                          </InputField>
                          <InputField label="Quantity">
                            <input
                              type="number"
                              value={wEntry.quantity || ''}
                              onChange={e => updateWarehouseEntry(size, wIdx, { quantity: parseInt(e.target.value) || 0 })}
                              min={0}
                              placeholder="0"
                              className="portal-input text-sm text-center font-mono font-bold"
                              style={{ background: 'var(--portal-elevated)' }}
                            />
                          </InputField>
                          <div className="flex justify-center pb-0.5">
                            <button
                              type="button"
                              onClick={() => removeWarehouseFromSize(size, wIdx)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-500/15 text-red-400/60 hover:text-red-400"
                              title="Remove warehouse"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {!validateWarehouseSelection() && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <MapPin size={12} /> Every warehouse with stock must have a name and valid 6-digit pincode.
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB: PRICING ═══ */}
          {activeTab === 'pricing' && (
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InputField label="Selling Price" required hint="₹">
                  <div className="relative">
                    <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
                    <input
                      type="number"
                      value={variant.price}
                      onChange={e => set('price', e.target.value)}
                      placeholder="1499"
                      className="portal-input pl-8 font-mono text-sm font-semibold"
                      style={{ background: 'var(--portal-elevated)' }}
                    />
                  </div>
                </InputField>
                <InputField label="Compare At" hint="Strikethrough">
                  <div className="relative">
                    <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
                    <input
                      type="number"
                      value={variant.compareAtPrice}
                      onChange={e => set('compareAtPrice', e.target.value)}
                      placeholder="1999"
                      className="portal-input pl-8 font-mono text-sm"
                      style={{ background: 'var(--portal-elevated)' }}
                    />
                  </div>
                </InputField>
                <InputField label="Cost Price" hint="For reports">
                  <div className="relative">
                    <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
                    <input
                      type="number"
                      value={variant.costPrice}
                      onChange={e => set('costPrice', e.target.value)}
                      placeholder="600"
                      className="portal-input pl-8 font-mono text-sm"
                      style={{ background: 'var(--portal-elevated)' }}
                    />
                  </div>
                </InputField>
                <InputField label="Weight" hint="grams">
                  <div className="relative">
                    <Weight size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
                    <input
                      type="number"
                      value={variant.weight}
                      onChange={e => set('weight', e.target.value)}
                      placeholder="350"
                      className="portal-input pl-8 font-mono text-sm"
                      style={{ background: 'var(--portal-elevated)' }}
                    />
                  </div>
                </InputField>
              </div>

              {/* Analytics Bar */}
              {(margin !== null || discount !== null) && (
                <div className="flex flex-wrap gap-3 p-3.5 rounded-xl" style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)' }}>
                  <div className="flex items-center gap-2">
                    <BarChart3 size={13} style={{ color: 'var(--portal-muted)' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>Analytics</span>
                  </div>
                  <div className="h-4 w-px" style={{ background: 'var(--portal-border)' }} />
                  {discount !== null && (
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold">
                      {discount}% Discount
                    </span>
                  )}
                  {margin !== null && (
                    <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold ${
                      margin > 30 ? 'bg-blue-500/10 text-blue-400' : margin > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {margin}% Margin
                    </span>
                  )}
                  {profit !== null && (
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 font-bold">
                      ₹{profit} Profit
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB: IMAGES ═══ */}
          {activeTab === 'images' && (
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ImagePlus size={14} style={{ color: 'var(--portal-accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>
                  Images for {variant.colorName || 'this color'}
                </span>
                <span className="text-[10px] ml-auto" style={{ color: 'var(--portal-muted)' }}>
                  {variant.images.length}/8 uploaded
                </span>
              </div>
              <ImageUploader
                images={variant.images}
                onChange={imgs => set('images', imgs)}
                maxImages={8}
                folder={`products/${productSlug}/variants/${(variant.sku || autoSkuPrefix).toLowerCase()}`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
