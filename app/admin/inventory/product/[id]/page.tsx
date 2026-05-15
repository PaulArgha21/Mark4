'use client'
import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Package, Warehouse, MapPin, Edit3, ExternalLink, Save, Loader2,
  X, IndianRupee, TrendingUp, BarChart3, ChevronDown, ChevronRight, Eye,
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, scaleInVariants } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
function formatPrice(n: number) { return `₹${n.toLocaleString('en-IN')}` }

// ── Types ──
interface InventoryRow {
  id: string; quantity: number; reserved: number; lowStockThreshold: number; warehouseId: string | null
  warehouse: { name: string; pincode: string | null; city: string | null; state: string | null } | null
}

interface Variant {
  id: string; sku: string; name: string | null; size: string | null; color: string | null
  colorHex: string | null; priceDelta: number; weight: number | null; isActive: boolean; sortOrder: number
  inventory: InventoryRow[]
}

interface Product {
  id: string; name: string; slug: string; brand: string | null
  basePrice: number; salePrice: number | null; costPrice: number | null
  isActive: boolean; isFeatured: boolean
  category: { id: string; name: string } | null
  variants: Variant[]
  _count: { reviews: number; orderItems: number }
}

// ── Adjust Modal ──
function AdjustModal({ inv, variant, onClose, onDone }: {
  inv: InventoryRow; variant: Variant; onClose: () => void; onDone: () => void
}) {
  const [newQty, setNewQty] = useState(String(inv.quantity))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!newQty || !reason.trim()) { toast.error('Fill all fields'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { newQty: parseInt(newQty), reason }
      if (inv.warehouseId) body.warehouseId = inv.warehouseId
      const res = await fetch(`/api/portal/inventory/${variant.id}/adjust`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Stock updated: ${variant.sku} → ${newQty} (delta: ${data.data?.delta ?? '?'})`)
        onDone()
        onClose()
      } else {
        toast.error(data.error?.message ?? data.message ?? 'Failed')
      }
    } catch { toast.error('Network error') }
    finally { setSaving(false) }
  }

  const delta = parseInt(newQty || '0') - inv.quantity
  const avail = Math.max(0, inv.quantity - inv.reserved)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div variants={scaleInVariants} initial="hidden" animate="visible" exit="hidden"
        className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Adjust Stock</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X size={18} style={{ color: 'var(--portal-muted)' }} /></button>
        </div>

        <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--portal-elevated)' }}>
          <div className="flex items-center gap-2">
            <Package size={16} style={{ color: 'var(--portal-accent)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>
                {variant.sku}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>
                {[variant.color, variant.size].filter(Boolean).join(' / ')}
              </p>
            </div>
          </div>
          {inv.warehouse && (
            <div className="flex items-center gap-1.5 pt-1.5" style={{ borderTop: '1px solid var(--portal-border)' }}>
              <Warehouse size={12} style={{ color: 'var(--portal-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--portal-text)' }}>{inv.warehouse.name}</span>
              {inv.warehouse.pincode && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>({inv.warehouse.pincode})</span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Current', value: inv.quantity, color: 'var(--portal-text)' },
            { label: 'Reserved', value: inv.reserved, color: 'var(--portal-muted)' },
            { label: 'Available', value: avail, color: avail <= 0 ? '#e03131' : '#4ade80' },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
              <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--portal-muted)' }}>{s.label}</p>
              <p className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--portal-muted)' }}>New Quantity</label>
            <input type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)} className="portal-input font-mono text-lg font-bold" />
            {newQty && delta !== 0 && (
              <p className="text-xs font-semibold mt-1" style={{ color: delta > 0 ? '#4ade80' : '#e03131' }}>
                Delta: {delta >= 0 ? '+' : ''}{delta}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--portal-muted)' }}>Reason *</label>
            <select value={reason} onChange={e => setReason(e.target.value)} className="portal-input">
              <option value="">Select reason...</option>
              <option value="Manual count correction">Manual count correction</option>
              <option value="Damaged/defective stock">Damaged/defective stock</option>
              <option value="Restock from supplier">Restock from supplier</option>
              <option value="Returned item">Returned item</option>
              <option value="Inventory audit">Inventory audit</option>
              <option value="Promotional allocation">Promotional allocation</option>
            </select>
          </div>
          <button onClick={handleSave} disabled={saving || !newQty || !reason}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-[0.98]"
            style={{ background: 'var(--portal-accent)', color: '#fff' }}>
            {saving ? 'Updating...' : 'Update Stock'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Variant Inventory Card ──
function VariantInventoryCard({ variant, product, onAdjust }: {
  variant: Variant; product: Product; onAdjust: (inv: InventoryRow) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const sp = product.salePrice ?? product.basePrice
  const effectiveBase = product.salePrice || product.basePrice
  const variantPrice = effectiveBase + variant.priceDelta
  const totalQty = variant.inventory.reduce((s, inv) => s + inv.quantity, 0)
  const totalReserved = variant.inventory.reduce((s, inv) => s + inv.reserved, 0)
  const totalAvail = Math.max(0, totalQty - totalReserved)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        style={{ background: expanded ? 'rgba(214,51,108,0.03)' : 'transparent' }}
      >
        {variant.colorHex && (
          <span className="w-8 h-8 rounded-xl flex-shrink-0 shadow" style={{ background: variant.colorHex, border: '2px solid rgba(255,255,255,0.1)' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>
              {[variant.color, variant.size].filter(Boolean).join(' / ') || variant.name || variant.sku}
            </p>
            {!variant.isActive && (
              <span className="text-[8px] uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">Inactive</span>
            )}
          </div>
          <p className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>{variant.sku}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs font-bold font-mono" style={{ color: 'var(--portal-text)' }}>{formatPrice(variantPrice)}</p>
            {product.salePrice && product.basePrice > product.salePrice && (
              <p className="text-[10px] line-through" style={{ color: 'var(--portal-muted)' }}>{formatPrice(product.basePrice + variant.priceDelta)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold font-mono" style={{ color: totalAvail > 0 ? '#4ade80' : '#e03131' }}>{totalQty} units</p>
            <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{totalAvail} avail</p>
          </div>
          <div style={{ color: 'var(--portal-muted)' }}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>
        </div>
      </div>

      {/* Warehouse rows */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--portal-border)' }}>
          {variant.inventory.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Warehouse size={24} className="mx-auto mb-2" style={{ color: 'var(--portal-muted)', opacity: 0.3 }} />
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>No inventory records for this variant</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--portal-elevated)' }}>
                    {['Warehouse', 'Location', 'Qty', 'Reserved', 'Available', 'Threshold', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {variant.inventory.map(inv => {
                    const avail = Math.max(0, inv.quantity - inv.reserved)
                    return (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderTop: '1px solid var(--portal-border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Warehouse size={13} style={{ color: 'var(--portal-accent)' }} />
                            <span className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>
                              {inv.warehouse?.name || 'Default'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {inv.warehouse?.pincode ? (
                            <div className="flex items-center gap-1">
                              <MapPin size={10} style={{ color: 'var(--portal-muted)' }} />
                              <span className="text-xs font-mono" style={{ color: 'var(--portal-muted)' }}>{inv.warehouse.pincode}</span>
                              {inv.warehouse.city && <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>· {inv.warehouse.city}</span>}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold font-mono" style={{ color: 'var(--portal-text)' }}>{inv.quantity}</td>
                        <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--portal-muted)' }}>{inv.reserved}</td>
                        <td className="px-4 py-3 text-sm font-bold font-mono" style={{ color: avail <= 0 ? '#e03131' : '#4ade80' }}>{avail}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{
                            background: inv.quantity <= inv.lowStockThreshold ? 'rgba(240,140,0,0.1)' : 'var(--portal-elevated)',
                            color: inv.quantity <= inv.lowStockThreshold ? '#f08c00' : 'var(--portal-muted)',
                          }}>
                            {inv.lowStockThreshold}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => onAdjust(inv)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                            style={{ background: 'var(--portal-accent)', color: '#fff' }}
                          >
                            <Edit3 size={10} /> Adjust
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──
export default function InventoryProductDetailPage() {
  const params = useParams()
  const productId = params.id as string
  const { data: product, isLoading, mutate } = useSWR<Product>(`/api/portal/products/${productId}`, fetcher)
  const [adjustTarget, setAdjustTarget] = useState<{ inv: InventoryRow; variant: Variant } | null>(null)

  const handleAdjustDone = useCallback(() => { mutate() }, [mutate])

  if (isLoading) {
    return (
      <PortalShell>
        <div className="space-y-4 max-w-5xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
          ))}
        </div>
      </PortalShell>
    )
  }

  if (!product) {
    return (
      <PortalShell>
        <div className="flex flex-col items-center justify-center py-20">
          <Package size={48} style={{ color: 'var(--portal-muted)', opacity: 0.3 }} />
          <p className="text-sm mt-3" style={{ color: 'var(--portal-muted)' }}>Product not found</p>
          <Link href="/admin/inventory/stock" className="text-xs mt-2" style={{ color: 'var(--portal-accent)' }}>← Back to Stock</Link>
        </div>
      </PortalShell>
    )
  }

  const effectivePrice = product.salePrice || product.basePrice
  const totalStock = product.variants.reduce((s, v) => s + v.inventory.reduce((vs, inv) => vs + inv.quantity, 0), 0)
  const totalReserved = product.variants.reduce((s, v) => s + v.inventory.reduce((vs, inv) => vs + inv.reserved, 0), 0)
  const totalAvail = Math.max(0, totalStock - totalReserved)
  const warehouseCount = new Set(product.variants.flatMap(v => v.inventory.map(inv => inv.warehouseId).filter(Boolean))).size
  const hasDiscount = product.salePrice !== null && product.basePrice > product.salePrice

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-5 max-w-6xl">
        {/* Header */}
        <motion.div variants={fadeUpVariants}>
          <div className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Link href="/admin/inventory/stock" className="p-2.5 rounded-xl transition-all hover:scale-105" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>
                  <ArrowLeft size={18} />
                </Link>
                <div>
                  <h1 className="font-display text-xl font-bold" style={{ color: 'var(--portal-text)' }}>{product.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {product.category && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>
                        {product.category.name}
                      </span>
                    )}
                    {product.brand && <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{product.brand}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${product.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/product/${product.slug}`} target="_blank"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)', border: '1px solid var(--portal-border)' }}>
                  <Eye size={13} /> View
                </Link>
                <Link href={`/admin/dashboard/products/${product.id}/edit`}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                  style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                  <ExternalLink size={13} /> Edit Product
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Selling Price', value: formatPrice(effectivePrice), icon: IndianRupee, color: '#339af0' },
            { label: 'Total Stock', value: totalStock.toLocaleString(), icon: Package, color: totalStock > 0 ? '#4ade80' : '#e03131' },
            { label: 'Reserved', value: totalReserved.toLocaleString(), icon: BarChart3, color: '#f08c00' },
            { label: 'Available', value: totalAvail.toLocaleString(), icon: TrendingUp, color: totalAvail > 0 ? '#4ade80' : '#e03131' },
            { label: 'Warehouses', value: warehouseCount.toString(), icon: Warehouse, color: '#7950f2' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <s.icon size={16} style={{ color: s.color }} />
              <p className="font-display text-xl font-bold mt-2 font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--portal-muted)' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Pricing Summary */}
        {(hasDiscount || product.costPrice) && (
          <motion.div variants={fadeUpVariants} className="p-4 rounded-2xl flex flex-wrap gap-4 items-center"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--portal-muted)' }}>Pricing</span>
            <div className="h-4 w-px" style={{ background: 'var(--portal-border)' }} />
            {hasDiscount && (
              <>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  {Math.round((1 - effectivePrice / product.basePrice) * 100)}% OFF
                </span>
                <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>MRP: <span className="line-through">{formatPrice(product.basePrice)}</span></span>
              </>
            )}
            {product.costPrice && (
              <>
                <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>Cost: {formatPrice(product.costPrice)}</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400">
                  {Math.round((effectivePrice - product.costPrice) / effectivePrice * 100)}% Margin
                </span>
              </>
            )}
          </motion.div>
        )}

        {/* Variant Section Header */}
        <motion.div variants={fadeUpVariants}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>
            Variants & Warehouse Stock ({product.variants.length} variant{product.variants.length !== 1 ? 's' : ''})
          </h2>
          <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>
            Click "Adjust" to update stock for any warehouse. Changes reflect instantly across all pages.
          </p>
        </motion.div>

        {/* Variant Cards */}
        {product.variants.map(v => (
          <motion.div key={v.id} variants={fadeUpVariants}>
            <VariantInventoryCard
              variant={v}
              product={product}
              onAdjust={(inv) => setAdjustTarget({ inv, variant: v })}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Adjust Modal */}
      <AnimatePresence>
        {adjustTarget && (
          <AdjustModal
            inv={adjustTarget.inv}
            variant={adjustTarget.variant}
            onClose={() => setAdjustTarget(null)}
            onDone={handleAdjustDone}
          />
        )}
      </AnimatePresence>
    </PortalShell>
  )
}
