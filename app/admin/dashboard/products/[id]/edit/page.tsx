'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Package, FileText, Layers, Search, Save, Loader2,
  CheckCircle2, ExternalLink, AlertTriangle, Shield,
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { BasicInfoSection, BasicInfoValues } from '../../_components/BasicInfoSection'
import { DescriptionBuilder, DescriptionValues } from '../../_components/DescriptionBuilder'
import { VariantManager } from '../../_components/VariantManager'
import { VariantFormValues } from '../../_components/VariantCard'
import { SeoSection, SeoValues } from '../../_components/SeoSection'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json()
    return data?.message || data?.error || data?.details?.message || fallback
  } catch {
    return fallback
  }
}

type Section = 'basic' | 'description' | 'variants' | 'seo'

const SECTIONS = [
  { key: 'basic' as Section, label: 'Basic Info', icon: Package },
  { key: 'description' as Section, label: 'Description', icon: FileText },
  { key: 'variants' as Section, label: 'Variants & Inventory', icon: Layers },
  { key: 'seo' as Section, label: 'SEO', icon: Search },
]

function inferSkuPrefix(sku?: string): string {
  if (!sku) return ''
  const parts = sku.split('-')
  return parts.length > 1 ? parts.slice(0, -1).join('-') : sku
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const { data: product, isLoading: productLoading, mutate } = useSWR(`/api/portal/products/${productId}`, fetcher)

  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('basic')
  const [saveError, setSaveError] = useState('')
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // ── Section State ──
  const [basicInfo, setBasicInfo] = useState<BasicInfoValues>({
    name: '', slug: '', shortDescription: '', categoryId: '', productType: 'VARIABLE',
    fabricType: '', fabricQuality: '', brand: '', tags: [], isFeatured: false, isPublished: true,
  })

  const [descriptionInfo, setDescriptionInfo] = useState<DescriptionValues>({
    fullDescription: '', keyFeatures: [], usageOccasion: [], careInstructions: [], productImages: [],
  })

  const [variants, setVariants] = useState<VariantFormValues[]>([])

  const [seoInfo, setSeoInfo] = useState<SeoValues>({
    metaTitle: '', metaDescription: '',
  })

  // ── Load product data ──
  useEffect(() => {
    if (product && !loaded) {
      setBasicInfo({
        name: product.name || '',
        slug: product.slug || '',
        shortDescription: product.shortDescription || '',
        categoryId: product.categoryId || '',
        productType: 'VARIABLE',
        fabricType: '',
        fabricQuality: '',
        brand: product.brand || '',
        tags: [],
        isFeatured: product.isFeatured || false,
        isPublished: product.isActive !== false,
      })

      setDescriptionInfo(prev => ({
        ...prev,
        fullDescription: product.description || '',
      }))

      setSeoInfo({
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
      })

      // Load variants — group DB variants by color into color-based cards
      if (product.variants?.length) {
        const bp = Number(product.basePrice) || 0
        const sp = product.salePrice ? Number(product.salePrice) : null
        const cp = product.costPrice ? Number(product.costPrice) : null
        // Effective base for selling price = salePrice (if discount) else basePrice
        const effectiveBase = sp || bp

        const colorMap = new Map<string, { variants: any[], price: number, colorHex: string, weight: string, isActive: boolean }>()
        for (const v of product.variants) {
          const colorKey = v.color || 'Default'
          if (!colorMap.has(colorKey)) {
            colorMap.set(colorKey, {
              variants: [],
              price: effectiveBase + Number(v.priceDelta || 0),
              colorHex: v.colorHex || '#000000',
              weight: v.weight ? String(v.weight) : '',
              isActive: v.isActive !== false,
            })
          }
          colorMap.get(colorKey)!.variants.push(v)
        }
        const loadedVariants: VariantFormValues[] = Array.from(colorMap.entries()).map(([colorName, data]) => {
          const skuPrefix = inferSkuPrefix(data.variants[0]?.sku)
          return {
            _localId: crypto.randomUUID(),
            colorName,
            colorHex: data.colorHex,
            sku: skuPrefix,
            price: data.price.toString(),
            compareAtPrice: sp ? bp.toString() : '',
            costPrice: cp ? cp.toString() : '',
            barcode: '',
            weight: data.weight,
            images: [],
            sizeQuantities: data.variants.map((v: any) => ({
              size: v.size || 'FREE',
              warehouses: Array.isArray(v.inventory)
                ? v.inventory
                    .filter((inv: any) => inv.warehouseId)
                    .map((inv: any) => ({
                      warehouseId: inv.warehouseId,
                      warehouseName: inv.warehouse?.name || '',
                      pincode: inv.warehouse?.pincode || '',
                      quantity: inv.quantity || 0,
                    }))
                : [],
            })),
            isActive: data.isActive,
          }
        })
        setVariants(loadedVariants)
      }

      setLoaded(true)
    }
  }, [product, loaded])

  // ── Completion ──
  const completion = useMemo(() => ({
    basic: !!basicInfo.name && !!basicInfo.categoryId,
    description: !!descriptionInfo.fullDescription,
    variants: variants.length > 0 && variants.every(v => !!v.sku && !!v.price),
    seo: !!(seoInfo.metaTitle || basicInfo.name),
  }), [basicInfo, descriptionInfo, variants, seoInfo])

  const completionPct = useMemo(() => {
    const items = Object.values(completion)
    return Math.round(items.filter(Boolean).length / items.length * 100)
  }, [completion])

  // ── Save Individual Variant ──
  const handleSaveVariant = useCallback(async (variant: VariantFormValues) => {
    if (!variant.sku || !variant.price) {
      toast.error('Variant must have SKU and price before saving')
      return
    }

    const price = parseFloat(variant.price)
    if (isNaN(price) || price < 0) {
      toast.error('Invalid variant price')
      return
    }

    try {
      const res = await fetch(`/api/portal/products/${productId}/variants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          colorName: variant.colorName || 'Default',
          colorHex: variant.colorHex || undefined,
          sku: variant.sku,
          price,
          compareAtPrice: variant.compareAtPrice ? parseFloat(variant.compareAtPrice) : undefined,
          costPrice: variant.costPrice ? parseFloat(variant.costPrice) : undefined,
          weight: variant.weight ? parseFloat(variant.weight) : undefined,
          isActive: variant.isActive,
          sizeQuantities: variant.sizeQuantities.map(sq => ({
            size: sq.size,
            warehouses: sq.warehouses
              .filter(w => w.warehouseName.trim() && w.pincode.length === 6 && w.quantity > 0)
              .map(w => ({ warehouseName: w.warehouseName.trim(), pincode: w.pincode, quantity: w.quantity })),
          })),
        }),
      })

      if (!res.ok) {
        const errMsg = await readErrorMessage(res, 'Failed to save variant')
        toast.error(errMsg)
        return
      }

      toast.success(`Variant "${variant.colorName}" saved`)
      setLastSaved(new Date().toLocaleTimeString())
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save variant')
    }
  }, [productId, mutate])

  // ── Save All ──
  const handleSave = useCallback(async () => {
    if (!basicInfo.name.trim()) { toast.error('Product name is required'); return }

    setSaving(true)
    setSaveError('')
    try {
      // ── Compute pricing from variant data ──
      const sellingPrices = variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p) && p > 0)
      const comparePrices = variants.map(v => parseFloat(v.compareAtPrice)).filter(p => !isNaN(p) && p > 0)
      const costPrices = variants.map(v => parseFloat(v.costPrice)).filter(p => !isNaN(p) && p > 0)

      const lowestSelling = sellingPrices.length ? Math.min(...sellingPrices) : Number(product?.basePrice) || 0
      const highestCompare = comparePrices.length ? Math.max(...comparePrices) : 0
      const lowestCost = costPrices.length ? Math.min(...costPrices) : undefined

      const hasDiscount = highestCompare > lowestSelling
      const basePrice = hasDiscount ? highestCompare : lowestSelling
      const salePrice = hasDiscount ? lowestSelling : undefined

      const payloadVariants = variants.length > 0 ? variants.flatMap((v, ci) =>
        v.sizeQuantities.map((sq, si) => ({
          sku: `${v.sku}-${sq.size}`,
          name: [v.colorName, sq.size].filter(Boolean).join(' / ') || undefined,
          size: sq.size || undefined,
          color: v.colorName || undefined,
          colorHex: v.colorHex || undefined,
          priceDelta: (parseFloat(v.price) || 0) - lowestSelling,
          weight: v.weight ? parseFloat(v.weight) : undefined,
          sortOrder: ci * 100 + si,
          isActive: v.isActive && sq.warehouses.some(w => w.quantity > 0),
          warehouses: sq.warehouses
            .filter(w => w.warehouseName.trim() && w.pincode.length === 6)
            .map(w => ({ warehouseName: w.warehouseName.trim(), pincode: w.pincode, quantity: w.quantity })),
        }))
      ) : undefined

      const res = await fetch(`/api/portal/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: basicInfo.name.trim(),
          description: descriptionInfo.fullDescription || undefined,
          shortDescription: basicInfo.shortDescription || undefined,
          brand: basicInfo.brand || undefined,
          categoryId: basicInfo.categoryId || undefined,
          basePrice,
          salePrice: salePrice ?? null,
          costPrice: lowestCost ?? null,
          isFeatured: basicInfo.isFeatured,
          isActive: basicInfo.isPublished,
          metaTitle: seoInfo.metaTitle || undefined,
          metaDescription: seoInfo.metaDescription || undefined,
          variants: payloadVariants,
        }),
      })

      if (!res.ok) {
        const errMsg = await readErrorMessage(res, 'Failed to update product')
        setSaveError(errMsg)
        toast.error(errMsg)
        return
      }

      // Upload variant images
      const allImages = variants.flatMap(v => v.images.filter(img => !img.uploading))
      if (allImages.length > 0) {
        await fetch(`/api/portal/products/${productId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            media: allImages.map((img, i) => ({
              url: img.url,
              isPrimary: i === 0,
              sortOrder: i,
            })),
          }),
        })
      }

      toast.success('Product updated successfully')
      setLastSaved(new Date().toLocaleTimeString())
      mutate()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong while saving the product.'
      setSaveError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }, [basicInfo, descriptionInfo, variants, seoInfo, productId, product, mutate])

  if (productLoading) {
    return (
      <PortalShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--portal-accent)' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>Loading product data...</p>
        </div>
      </PortalShell>
    )
  }

  if (!product) {
    return (
      <PortalShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <AlertTriangle size={28} style={{ color: 'var(--portal-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--portal-muted)' }}>Product not found</p>
          <button onClick={() => router.back()} className="text-xs font-semibold px-4 py-2 rounded-xl" style={{ color: 'var(--portal-accent)', background: 'var(--portal-elevated)' }}>
            Go back
          </button>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-5 max-w-7xl">
        {/* ═══ HEADER ═══ */}
        <motion.div variants={fadeUpVariants}>
          <div className="flex items-start justify-between flex-wrap gap-4 p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2.5 rounded-xl transition-all hover:scale-105"
                style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="font-display text-xl font-bold" style={{ color: 'var(--portal-text)' }}>
                  {basicInfo.name || 'Edit Product'}
                </h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>
                    /{product.slug}
                  </span>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                    basicInfo.isPublished ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {basicInfo.isPublished ? 'Published' : 'Draft'}
                  </span>
                  {lastSaved && (
                    <span className="text-[9px] flex items-center gap-1" style={{ color: 'var(--portal-muted)' }}>
                      <Shield size={8} /> Saved {lastSaved}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2">
              {/* Completion indicator */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
                <div className="relative w-7 h-7">
                  <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--portal-border)" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke={completionPct === 100 ? '#4ade80' : 'var(--portal-accent)'}
                      strokeWidth="2.5"
                      strokeDasharray={`${completionPct * 0.94} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {completionPct === 100 && (
                    <CheckCircle2 size={12} className="absolute inset-0 m-auto text-emerald-400" />
                  )}
                </div>
                <span className="text-[10px] font-bold" style={{ color: completionPct === 100 ? '#4ade80' : 'var(--portal-muted)' }}>
                  {completionPct}%
                </span>
              </div>

              <ClayButton
                variant="ghost"
                size="sm"
                onClick={() => window.open(`/product/${product.slug}`, '_blank')}
                disabled={saving}
              >
                <ExternalLink size={14} />
                Preview
              </ClayButton>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'var(--portal-accent)', boxShadow: '0 4px 12px rgba(214,51,108,0.25)' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save All Changes
              </button>
            </div>
          </div>

          {/* Error banner */}
          {saveError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium border border-red-500/30 bg-red-500/10 text-red-300">
              <AlertTriangle size={14} />
              {saveError}
              <button onClick={() => setSaveError('')} className="ml-auto text-red-400 hover:text-red-300 text-[10px] font-bold">Dismiss</button>
            </div>
          )}
        </motion.div>

        {/* ═══ SECTION TABS ═══ */}
        <motion.div variants={fadeUpVariants}>
          <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)' }}>
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeSection === s.key ? 'shadow-md' : 'hover:opacity-80'
                }`}
                style={{
                  background: activeSection === s.key ? 'var(--portal-surface)' : 'transparent',
                  color: activeSection === s.key ? 'var(--portal-accent)' : 'var(--portal-muted)',
                  boxShadow: activeSection === s.key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <s.icon size={14} />
                {s.label}
                {completion[s.key] && <CheckCircle2 size={11} className="text-emerald-400" />}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ═══ BASIC INFO ═══ */}
        {activeSection === 'basic' && (
          <motion.div variants={fadeUpVariants} className="space-y-4">
            <BasicInfoSection values={basicInfo} onChange={setBasicInfo} />
            {/* Product Meta */}
            <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>Product Metadata</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Product ID', value: product.id },
                  { label: 'Slug', value: product.slug },
                  { label: 'Created', value: new Date(product.createdAt).toLocaleDateString() },
                  { label: 'Updated', value: new Date(product.updatedAt).toLocaleDateString() },
                ].map(item => (
                  <div key={item.label} className="px-3 py-2 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--portal-muted)' }}>{item.label}</p>
                    <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: 'var(--portal-text)' }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ DESCRIPTION ═══ */}
        {activeSection === 'description' && (
          <motion.div variants={fadeUpVariants}>
            <DescriptionBuilder
              productName={basicInfo.name}
              fabricType={basicInfo.fabricType}
              fabricQuality={basicInfo.fabricQuality}
              values={descriptionInfo}
              onChange={setDescriptionInfo}
            />
          </motion.div>
        )}

        {/* ═══ VARIANTS ═══ */}
        {activeSection === 'variants' && (
          <motion.div variants={fadeUpVariants}>
            {/* Hint */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-[11px] font-medium" style={{ background: 'rgba(214,51,108,0.06)', color: 'var(--portal-accent)', border: '1px solid rgba(214,51,108,0.15)' }}>
              <Save size={12} />
              Each variant has its own <strong>Save</strong> button — save individual variants without affecting others.
            </div>
            <VariantManager
              variants={variants}
              onChange={setVariants}
              productSlug={product.slug}
              onSaveVariant={handleSaveVariant}
            />
          </motion.div>
        )}

        {/* ═══ SEO ═══ */}
        {activeSection === 'seo' && (
          <motion.div variants={fadeUpVariants}>
            <SeoSection
              productName={basicInfo.name}
              productSlug={product.slug}
              shortDescription={basicInfo.shortDescription}
              values={seoInfo}
              onChange={setSeoInfo}
            />
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}
