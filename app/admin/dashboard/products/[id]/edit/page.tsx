'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { ArrowLeft, Package, Palette, Save, Loader2, Image as ImageIcon, DollarSign, Search as SearchIcon, Settings, Trash2 } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { ImageUploader, UploadedImage } from '@/components/portal/products/ImageUploader'
import { ColorPicker, ColorOption } from '@/components/portal/products/ColorPicker'
import { SizeSelector, SizeType } from '@/components/portal/products/SizeSelector'
import { VariantMatrix, VariantRow } from '@/components/portal/products/VariantMatrix'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const PRODUCT_TYPES = ['Clothing', 'Footwear', 'Accessories', 'Jewelry', 'Bags', 'Home & Living', 'Beauty', 'Electronics']
const MATERIALS = ['Cotton', 'Silk', 'Polyester', 'Linen', 'Wool', 'Denim', 'Chiffon', 'Georgette', 'Velvet', 'Satin', 'Rayon', 'Nylon', 'Leather', 'Faux Leather', 'Suede', 'Canvas']
const CARE_INSTRUCTIONS = ['Machine Wash', 'Hand Wash Only', 'Dry Clean Only', 'Do Not Bleach', 'Iron Low Heat', 'Do Not Iron', 'Tumble Dry Low', 'Hang Dry', 'Do Not Wring']
const GST_SLABS = [{ rate: 5, label: '5% (Apparel < ₹1000)' }, { rate: 12, label: '12% (Apparel > ₹1000)' }, { rate: 18, label: '18% (Footwear, Bags)' }, { rate: 28, label: '28% (Luxury)' }]

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const { data: product, isLoading: productLoading } = useSWR(`/api/portal/products/${productId}`, fetcher)
  const { data: categories } = useSWR('/api/storefront/categories', fetcher)
  const { data: mediaAssets } = useSWR(`/api/portal/products/${productId}/media`, fetcher)

  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeSection, setActiveSection] = useState<'basic' | 'media' | 'variants' | 'pricing' | 'seo' | 'advanced'>('basic')

  // Basic
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [productType, setProductType] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Advanced
  const [material, setMaterial] = useState<string[]>([])
  const [careInstructions, setCareInstructions] = useState<string[]>([])
  const [hsnCode, setHsnCode] = useState('')
  const [gstRate, setGstRate] = useState(12)
  const [weight, setWeight] = useState('')
  const [countryOfOrigin, setCountryOfOrigin] = useState('India')

  // Pricing
  const [basePrice, setBasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('')

  // SEO
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')

  // Media
  const [images, setImages] = useState<UploadedImage[]>([])

  // Variants
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [sizeType, setSizeType] = useState<SizeType>('clothing')
  const [variants, setVariants] = useState<VariantRow[]>([])

  // Load product data into form
  useEffect(() => {
    if (product && !loaded) {
      setName(product.name || '')
      setDescription(product.description || '')
      setShortDescription(product.shortDescription || '')
      setBrand(product.brand || '')
      setCategoryId(product.categoryId || '')
      setIsFeatured(product.isFeatured || false)
      setIsActive(product.isActive !== false)
      setBasePrice(product.basePrice?.toString() || '')
      setSalePrice(product.salePrice?.toString() || '')
      setCostPrice(product.costPrice?.toString() || '')
      setMetaTitle(product.metaTitle || '')
      setMetaDescription(product.metaDescription || '')

      // Load variants
      if (product.variants?.length) {
        const loadedVariants: VariantRow[] = product.variants.map((v: any) => ({
          id: v.id,
          sku: v.sku || '',
          size: v.size || '',
          color: v.color || '',
          colorHex: v.colorHex || '',
          priceDelta: v.priceDelta || 0,
          weight: v.weight || null,
          stock: v.inventory?.quantity || 0,
          isActive: v.isActive !== false,
        }))
        setVariants(loadedVariants)

        // Reconstruct selected colors/sizes from variants
        const colors: ColorOption[] = []
        const sizes: string[] = []
        for (const v of loadedVariants) {
          if (v.color && !colors.find(c => c.name === v.color)) {
            colors.push({ name: v.color, hex: v.colorHex || '#000' })
          }
          if (v.size && !sizes.includes(v.size)) {
            sizes.push(v.size)
          }
        }
        setSelectedColors(colors)
        setSelectedSizes(sizes)
      }

      setLoaded(true)
    }
  }, [product, loaded])

  // Load media
  useEffect(() => {
    if (mediaAssets && images.length === 0 && loaded) {
      const loadedImages: UploadedImage[] = mediaAssets.map((m: any) => ({
        id: m.id,
        url: m.url,
        isPrimary: m.isPrimary,
        uploading: false,
      }))
      setImages(loadedImages)
    }
  }, [mediaAssets, loaded, images.length])

  // Computed
  const discount = useMemo(() => {
    if (!basePrice || !salePrice) return null
    const bp = parseFloat(basePrice)
    const sp = parseFloat(salePrice)
    if (!bp || !sp || sp >= bp) return null
    return Math.round((1 - sp / bp) * 100)
  }, [basePrice, salePrice])

  const margin = useMemo(() => {
    if (!salePrice || !costPrice) return null
    const sp = parseFloat(salePrice || basePrice)
    const cp = parseFloat(costPrice)
    if (!sp || !cp) return null
    return Math.round((sp - cp) / sp * 100)
  }, [salePrice, costPrice, basePrice])

  const profit = useMemo(() => {
    const sp = parseFloat(salePrice || basePrice)
    const cp = parseFloat(costPrice)
    if (!sp || !cp) return null
    return sp - cp
  }, [salePrice, costPrice, basePrice])

  const gstAmount = useMemo(() => {
    const sp = parseFloat(salePrice || basePrice)
    if (!sp) return null
    return (sp * gstRate / (100 + gstRate)).toFixed(2)
  }, [salePrice, basePrice, gstRate])

  // Tags
  const addTag = useCallback(() => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }, [tagInput, tags])

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }, [])

  // Save (update)
  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error('Product name is required'); return }
    if (!basePrice) { toast.error('Base price is required'); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/portal/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description,
          shortDescription,
          brand,
          categoryId: categoryId || undefined,
          basePrice: parseFloat(basePrice),
          salePrice: salePrice ? parseFloat(salePrice) : undefined,
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
          isFeatured,
          isActive,
          metaTitle,
          metaDescription,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message || 'Failed to update product')
        return
      }

      // Update media
      if (images.length > 0) {
        await fetch(`/api/portal/products/${productId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            media: images.filter(img => !img.uploading).map((img, i) => ({
              url: img.url,
              isPrimary: img.isPrimary,
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
  }, [name, description, shortDescription, brand, categoryId, basePrice, salePrice, costPrice, isFeatured, isActive, metaTitle, metaDescription, images, productId, router])

  const sections = [
    { key: 'basic' as const, label: 'Basic Info', icon: Package },
    { key: 'media' as const, label: 'Media', icon: ImageIcon },
    { key: 'variants' as const, label: 'Variants', icon: Palette },
    { key: 'pricing' as const, label: 'Pricing', icon: DollarSign },
    { key: 'advanced' as const, label: 'Advanced', icon: Settings },
    { key: 'seo' as const, label: 'SEO', icon: SearchIcon },
  ]

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
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--portal-elevated)]" style={{ color: 'var(--portal-muted)' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Edit Product</h1>
              <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>{product.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClayButton variant="ghost" size="sm" onClick={() => router.push(`/product/${product.slug}`)} disabled={saving}>
              Preview
            </ClayButton>
            <ClayButton variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </ClayButton>
          </div>
        </motion.div>

        {/* Section Tabs */}
        <motion.div variants={fadeUpVariants} className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--portal-elevated)' }}>
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeSection === s.key ? 'shadow-sm' : 'hover:opacity-80'
              }`}
              style={{
                background: activeSection === s.key ? 'var(--portal-surface)' : 'transparent',
                color: activeSection === s.key ? 'var(--portal-accent)' : 'var(--portal-muted)',
              }}
            >
              <s.icon size={13} />
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* ═══ BASIC INFO ═══ */}
        {activeSection === 'basic' && (
          <motion.div variants={fadeUpVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <FormCard title="Product Information">
                <FormField label="Product Name" required>
                  <input value={name} onChange={e => setName(e.target.value)} className="portal-input" />
                </FormField>
                <FormField label="Short Description">
                  <input value={shortDescription} onChange={e => setShortDescription(e.target.value)} className="portal-input" />
                </FormField>
                <FormField label="Full Description">
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={7} className="portal-input resize-none" />
                </FormField>
              </FormCard>

              <FormCard title="Tags & Keywords">
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--portal-accent)', color: 'var(--portal-accent)' }}>
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Type a tag and press Enter" className="portal-input flex-1" />
                  <button type="button" onClick={addTag} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)' }}>Add</button>
                </div>
              </FormCard>
            </div>

            <div className="space-y-4">
              <FormCard title="Organization">
                <FormField label="Product Type">
                  <select value={productType} onChange={e => setProductType(e.target.value)} className="portal-input">
                    <option value="">Select type</option>
                    {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Brand">
                  <input value={brand} onChange={e => setBrand(e.target.value)} className="portal-input" />
                </FormField>
                <FormField label="Category">
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="portal-input">
                    <option value="">Select category</option>
                    {categories?.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </FormField>
              </FormCard>

              <FormCard title="Visibility">
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-[var(--portal-elevated)]">
                    <span className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>Active</span>
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-[var(--portal-elevated)]">
                    <span className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>Featured</span>
                    <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded" />
                  </label>
                </div>
              </FormCard>

              {/* Product Meta */}
              <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>Product Info</p>
                <div className="space-y-1 text-[10px]" style={{ color: 'var(--portal-muted)' }}>
                  <p>ID: <span className="font-mono">{product.id}</span></p>
                  <p>Slug: <span className="font-mono">{product.slug}</span></p>
                  <p>Created: {new Date(product.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(product.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ MEDIA ═══ */}
        {activeSection === 'media' && (
          <motion.div variants={fadeUpVariants}>
            <FormCard title="Product Images">
              <ImageUploader images={images} onChange={setImages} maxImages={10} folder="products" />
              <p className="text-[10px] mt-2" style={{ color: 'var(--portal-muted)' }}>
                Drag to reorder. Star to set primary. Recommended: 1000×1000px, square.
              </p>
            </FormCard>
          </motion.div>
        )}

        {/* ═══ VARIANTS ═══ */}
        {activeSection === 'variants' && (
          <motion.div variants={fadeUpVariants} className="space-y-4">
            <FormCard title="Colors">
              <ColorPicker selected={selectedColors} onChange={setSelectedColors} />
            </FormCard>
            <FormCard title="Sizes">
              <SizeSelector sizeType={sizeType} selected={selectedSizes} onChange={setSelectedSizes} onSizeTypeChange={setSizeType} />
            </FormCard>
            <FormCard title="Variant Matrix">
              <VariantMatrix variants={variants} colors={selectedColors} sizes={sizeType === 'free' ? [] : selectedSizes} productName={name} onChange={setVariants} />
            </FormCard>
          </motion.div>
        )}

        {/* ═══ PRICING ═══ */}
        {activeSection === 'pricing' && (
          <motion.div variants={fadeUpVariants} className="space-y-4">
            <FormCard title="Pricing">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Base Price (MRP) ₹" required>
                  <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} className="portal-input" />
                </FormField>
                <FormField label="Sale Price ₹">
                  <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="portal-input" />
                </FormField>
                <FormField label="Cost Price ₹">
                  <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="portal-input" />
                </FormField>
              </div>
            </FormCard>

            {(basePrice || salePrice || costPrice) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <CalcCard label="Discount" value={discount ? `${discount}%` : '—'} color="#22C55E" sub="off MRP" />
                <CalcCard label="Margin" value={margin ? `${margin}%` : '—'} color="#3B82F6" sub="of selling" />
                <CalcCard label="Profit" value={profit ? `₹${profit.toFixed(0)}` : '—'} color="#A855F7" sub="per unit" />
                <CalcCard label="GST" value={gstAmount ? `₹${gstAmount}` : '—'} color="#F97316" sub={`@ ${gstRate}%`} />
              </div>
            )}

            <FormCard title="Tax">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="GST Slab">
                  <select value={gstRate} onChange={e => setGstRate(parseInt(e.target.value))} className="portal-input">
                    {GST_SLABS.map(s => <option key={s.rate} value={s.rate}>{s.label}</option>)}
                  </select>
                </FormField>
                <FormField label="HSN Code">
                  <input value={hsnCode} onChange={e => setHsnCode(e.target.value)} className="portal-input" />
                </FormField>
              </div>
            </FormCard>
          </motion.div>
        )}

        {/* ═══ ADVANCED ═══ */}
        {activeSection === 'advanced' && (
          <motion.div variants={fadeUpVariants} className="space-y-4">
            <FormCard title="Material & Fabric">
              <div className="flex flex-wrap gap-2">
                {MATERIALS.map(m => (
                  <button key={m} type="button" onClick={() => setMaterial(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${material.includes(m) ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]' : 'border-[var(--portal-border)]'}`} style={{ color: material.includes(m) ? undefined : 'var(--portal-text)' }}>{m}</button>
                ))}
              </div>
            </FormCard>
            <FormCard title="Care Instructions">
              <div className="flex flex-wrap gap-2">
                {CARE_INSTRUCTIONS.map(c => (
                  <button key={c} type="button" onClick={() => setCareInstructions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${careInstructions.includes(c) ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]' : 'border-[var(--portal-border)]'}`} style={{ color: careInstructions.includes(c) ? undefined : 'var(--portal-text)' }}>{c}</button>
                ))}
              </div>
            </FormCard>
            <FormCard title="Shipping & Origin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Weight (g)">
                  <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="portal-input" />
                </FormField>
                <FormField label="Country of Origin">
                  <input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)} className="portal-input" />
                </FormField>
              </div>
            </FormCard>
          </motion.div>
        )}

        {/* ═══ SEO ═══ */}
        {activeSection === 'seo' && (
          <motion.div variants={fadeUpVariants} className="space-y-4">
            <FormCard title="SEO">
              <FormField label="Meta Title">
                <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder={name} className="portal-input" />
                <p className="text-[10px] mt-1" style={{ color: (metaTitle || name).length > 60 ? '#ef4444' : 'var(--portal-muted)' }}>{(metaTitle || name).length}/60</p>
              </FormField>
              <FormField label="Meta Description">
                <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} rows={3} className="portal-input resize-none" />
                <p className="text-[10px] mt-1" style={{ color: metaDescription.length > 160 ? '#ef4444' : 'var(--portal-muted)' }}>{metaDescription.length}/160</p>
              </FormField>
            </FormCard>
            <FormCard title="Search Preview">
              <div className="p-4 rounded-xl" style={{ background: '#fff' }}>
                <p className="text-sm font-medium text-[#1a0dab] truncate">{metaTitle || name || 'Product Title'}</p>
                <p className="text-xs text-[#006621] truncate">aprdite.com/product/{product.slug}</p>
                <p className="text-xs text-[#545454] mt-0.5 line-clamp-2">{metaDescription || shortDescription || 'Description...'}</p>
              </div>
            </FormCard>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>{title}</h3>
      {children}
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function CalcCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
      <p className="text-[10px] font-medium" style={{ color: 'var(--portal-muted)' }}>{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
      <p className="text-[9px]" style={{ color: 'var(--portal-muted)' }}>{sub}</p>
    </div>
  )
}
