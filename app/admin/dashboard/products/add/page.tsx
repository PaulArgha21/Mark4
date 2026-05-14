'use client'
import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Package, FileText, Layers, Search, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { BasicInfoSection, BasicInfoValues } from '../_components/BasicInfoSection'
import { DescriptionBuilder, DescriptionValues } from '../_components/DescriptionBuilder'
import { VariantManager } from '../_components/VariantManager'
import { VariantFormValues } from '../_components/VariantCard'
import { SeoSection, SeoValues } from '../_components/SeoSection'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

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
  { key: 'variants' as Section, label: 'Variants', icon: Layers },
  { key: 'seo' as Section, label: 'SEO', icon: Search },
]

export default function AddProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>('basic')

  // ── Section State ──
  const [basicInfo, setBasicInfo] = useState<BasicInfoValues>({
    name: '', slug: '', shortDescription: '', categoryId: '', productType: 'VARIABLE',
    fabricType: '', fabricQuality: '', brand: '', tags: [], isFeatured: false, isPublished: false,
  })

  const [descriptionInfo, setDescriptionInfo] = useState<DescriptionValues>({
    fullDescription: '', keyFeatures: [], usageOccasion: [], careInstructions: [], productImages: [],
  })

  const [variants, setVariants] = useState<VariantFormValues[]>([])

  const [seoInfo, setSeoInfo] = useState<SeoValues>({
    metaTitle: '', metaDescription: '',
  })

  // ── Completion check ──
  const completion = useMemo(() => ({
    basic: !!basicInfo.name && !!basicInfo.categoryId,
    description: descriptionInfo.keyFeatures.length > 0 || !!descriptionInfo.fullDescription,
    variants: variants.length > 0 && variants.every(v => !!v.sku && !!v.price && v.sizeQuantities.some(sq => sq.warehouses.some(w => w.quantity > 0))),
    seo: !!(seoInfo.metaTitle || basicInfo.name),
  }), [basicInfo, descriptionInfo, variants, seoInfo])

  const completionPct = useMemo(() => {
    const items = Object.values(completion)
    return Math.round(items.filter(Boolean).length / items.length * 100)
  }, [completion])

  // ── Save handler ──
  const handleSave = useCallback(async (asDraft = false) => {
    if (!basicInfo.name.trim()) { toast.error('Product name is required'); return }
    if (!variants.length) { toast.error('At least one color variant is required'); return }
    const noPrice = variants.find(v => !v.price)
    if (noPrice) { toast.error('All color variants must have a selling price'); return }
    const noSku = variants.find(v => !v.sku)
    if (noSku) { toast.error('All color variants must have a SKU'); return }

    setSaving(true)
    try {
      // Compute base price from lowest variant price
      const prices = variants.map(v => parseFloat(v.price)).filter(p => !isNaN(p))
      const lowestPrice = Math.min(...prices)

      const res = await fetch('/api/portal/products', {
        method: 'POST',
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
          isActive: asDraft ? false : basicInfo.isPublished,
          metaTitle: seoInfo.metaTitle || undefined,
          metaDescription: seoInfo.metaDescription || undefined,
          variants: variants.filter(v => v.isActive).flatMap((v, ci) =>
            v.sizeQuantities
              .filter(sq => sq.warehouses.some(w => w.quantity > 0))
              .map((sq, si) => ({
                sku: `${v.sku}-${sq.size}`,
                name: [v.colorName, sq.size].filter(Boolean).join(' / ') || undefined,
                size: sq.size || undefined,
                color: v.colorName || undefined,
                colorHex: v.colorHex || undefined,
                priceDelta: parseFloat(v.price) - lowestPrice,
                weight: v.weight ? parseFloat(v.weight) : undefined,
                sortOrder: ci * 100 + si,
                warehouses: sq.warehouses
                  .filter(w => w.quantity > 0 && w.warehouseName.trim() && w.pincode.length === 6)
                  .map(w => ({ warehouseName: w.warehouseName.trim(), pincode: w.pincode, quantity: w.quantity })),
              }))
          ),
        }),
      })

      if (!res.ok) {
        const errMsg = await readErrorMessage(res, 'Failed to create product')
        toast.error(errMsg)
        return
      }

      const { data } = await res.json()

      // Upload variant images as product media
      const allImages = variants.flatMap(v => v.images.filter(img => !img.uploading))
      if (allImages.length > 0) {
        await fetch(`/api/portal/products/${data.id}/media`, {
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

      toast.success(asDraft ? 'Product saved as draft' : 'Product created successfully')
      router.push('/admin/dashboard/products')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }, [basicInfo, descriptionInfo, variants, seoInfo, router])

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
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Add Product</h1>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                {basicInfo.name ? basicInfo.name : 'Create a new product with full variant configuration'}
                {basicInfo.slug && <span className="font-mono ml-1 opacity-60">/{basicInfo.slug}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Completion ring */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
              <div className="relative w-6 h-6">
                <svg viewBox="0 0 36 36" className="w-6 h-6 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--portal-border)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--portal-accent)" strokeWidth="3" strokeDasharray={`${completionPct * 0.94} 100`} strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[10px] font-medium" style={{ color: 'var(--portal-muted)' }}>{completionPct}%</span>
            </div>
            <ClayButton variant="ghost" size="sm" onClick={() => handleSave(true)} disabled={saving}>
              Save as Draft
            </ClayButton>
            <ClayButton variant="primary" size="sm" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Publish
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

        {/* ═══ SECTION: BASIC INFO ═══ */}
        {activeSection === 'basic' && (
          <motion.div variants={fadeUpVariants}>
            <BasicInfoSection values={basicInfo} onChange={setBasicInfo} />
          </motion.div>
        )}

        {/* ═══ SECTION: DESCRIPTION BUILDER ═══ */}
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

        {/* ═══ SECTION: VARIANTS ═══ */}
        {activeSection === 'variants' && (
          <motion.div variants={fadeUpVariants}>
            <VariantManager
              variants={variants}
              onChange={setVariants}
              productSlug={basicInfo.slug}
            />
          </motion.div>
        )}

        {/* ═══ SECTION: SEO ═══ */}
        {activeSection === 'seo' && (
          <motion.div variants={fadeUpVariants}>
            <SeoSection
              productName={basicInfo.name}
              productSlug={basicInfo.slug}
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
