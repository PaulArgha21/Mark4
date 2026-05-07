'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { ArrowLeft, Package, FileText, Layers, Search, Save, Loader2, CheckCircle2 } from 'lucide-react'
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

type Section = 'basic' | 'description' | 'variants' | 'seo'

const SECTIONS = [
  { key: 'basic' as Section, label: 'Basic Info', icon: Package },
  { key: 'description' as Section, label: 'Description', icon: FileText },
  { key: 'variants' as Section, label: 'Variants', icon: Layers },
  { key: 'seo' as Section, label: 'SEO', icon: Search },
]

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const { data: product, isLoading: productLoading } = useSWR(`/api/portal/products/${productId}`, fetcher)

  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('basic')

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
        const colorMap = new Map<string, { variants: any[], price: number, colorHex: string, weight: string, isActive: boolean }>()
        for (const v of product.variants) {
          const colorKey = v.color || 'Default'
          if (!colorMap.has(colorKey)) {
            colorMap.set(colorKey, {
              variants: [],
              price: bp + Number(v.priceDelta || 0),
              colorHex: v.colorHex || '#000000',
              weight: v.weight ? String(v.weight) : '',
              isActive: v.isActive !== false,
            })
          }
          colorMap.get(colorKey)!.variants.push(v)
        }
        const loadedVariants: VariantFormValues[] = Array.from(colorMap.entries()).map(([colorName, data]) => {
          const skuParts = data.variants[0]?.sku?.split('-') || []
          const skuPrefix = skuParts.length > 1 ? skuParts.slice(0, -1).join('-') : data.variants[0]?.sku || ''
          return {
            _localId: crypto.randomUUID(),
            colorName,
            colorHex: data.colorHex,
            sku: skuPrefix,
            price: data.price.toString(),
            compareAtPrice: product.salePrice ? Number(product.basePrice).toString() : '',
            costPrice: product.costPrice ? Number(product.costPrice).toString() : '',
            barcode: '',
            weight: data.weight,
            images: [],
            inventory: [],
            sizeQuantities: data.variants.map((v: any) => ({
              size: v.size || 'FREE',
              quantity: v.inventory?.quantity || 0,
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

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!basicInfo.name.trim()) { toast.error('Product name is required'); return }

    setSaving(true)
    try {
      const prices = variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p))
      const lowestPrice = prices.length > 0 ? Math.min(...prices) : Number(product?.basePrice) || 0

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
          basePrice: lowestPrice,
          isFeatured: basicInfo.isFeatured,
          isActive: basicInfo.isPublished,
          metaTitle: seoInfo.metaTitle || undefined,
          metaDescription: seoInfo.metaDescription || undefined,
          variants: variants.length > 0 ? variants.flatMap((v, ci) =>
            v.sizeQuantities.map((sq, si) => ({
              sku: `${v.sku}-${sq.size}`,
              name: [v.colorName, sq.size].filter(Boolean).join(' / ') || undefined,
              size: sq.size || undefined,
              color: v.colorName || undefined,
              colorHex: v.colorHex || undefined,
              priceDelta: parseFloat(v.price) - lowestPrice,
              weight: v.weight ? parseFloat(v.weight) : undefined,
              sortOrder: ci * 100 + si,
              isActive: v.isActive && sq.quantity > 0,
              quantity: sq.quantity,
            }))
          ) : undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message || 'Failed to update product')
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
      router.push('/admin/dashboard/products')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }, [basicInfo, descriptionInfo, variants, seoInfo, productId, product, router])

  if (productLoading) {
    return (
      <PortalShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--portal-accent)' }} />
        </div>
      </PortalShell>
    )
  }

  if (!product) {
    return (
      <PortalShell>
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Product not found</p>
          <button onClick={() => router.back()} className="text-xs mt-2" style={{ color: 'var(--portal-accent)' }}>Go back</button>
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6 max-w-7xl">
        {/* ── Header ── */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--portal-elevated)]" style={{ color: 'var(--portal-muted)' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Edit Product</h1>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                {basicInfo.name}
                <span className="font-mono ml-1 opacity-60">/{product.slug}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
              <div className="relative w-6 h-6">
                <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--portal-border)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--portal-accent)" strokeWidth="3" strokeDasharray={`${completionPct * 0.94} 100`} strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'var(--portal-muted)' }}>{completionPct}%</span>
            </div>
            <ClayButton variant="ghost" size="sm" onClick={() => router.push(`/product/${product.slug}`)} disabled={saving}>
              Preview
            </ClayButton>
            <ClayButton variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </ClayButton>
          </div>
        </motion.div>

        {/* ── Section Tabs ── */}
        <motion.div variants={fadeUpVariants} className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--portal-elevated)' }}>
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeSection === s.key ? 'shadow-sm' : 'hover:opacity-80'
              }`}
              style={{
                background: activeSection === s.key ? 'var(--portal-surface)' : 'transparent',
                color: activeSection === s.key ? 'var(--portal-accent)' : 'var(--portal-muted)',
              }}
            >
              <s.icon size={13} />
              {s.label}
              {completion[s.key] && <CheckCircle2 size={10} className="text-green-400" />}
            </button>
          ))}
        </motion.div>

        {/* ═══ BASIC INFO ═══ */}
        {activeSection === 'basic' && (
          <motion.div variants={fadeUpVariants}>
            <BasicInfoSection values={basicInfo} onChange={setBasicInfo} />
            {/* Product Meta */}
            <div className="mt-4 rounded-2xl p-4 space-y-2" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>Product Info</p>
              <div className="flex flex-wrap gap-4 text-[10px]" style={{ color: 'var(--portal-muted)' }}>
                <p>ID: <span className="font-mono">{product.id}</span></p>
                <p>Slug: <span className="font-mono">{product.slug}</span></p>
                <p>Created: {new Date(product.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(product.updatedAt).toLocaleDateString()}</p>
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
            <VariantManager
              variants={variants}
              onChange={setVariants}
              productSlug={product.slug}
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
