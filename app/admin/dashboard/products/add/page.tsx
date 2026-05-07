'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Package, Tag, Palette, Ruler, Save, Eye, Loader2 } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { ImageUploader, UploadedImage } from '@/components/portal/products/ImageUploader'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

interface Variant {
  id: string
  sku: string
  name: string
  size: string
  color: string
  colorHex: string
  priceDelta: number
  weight: number | null
  stock: number
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'FREE']
const PRESET_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Beige', hex: '#D4A574' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Grey', hex: '#6B7280' },
  { name: 'Maroon', hex: '#7F1D1D' },
  { name: 'Teal', hex: '#14B8A6' },
]

export default function AddProductPage() {
  const router = useRouter()
  const { data: categories } = useSWR('/api/storefront/categories', fetcher)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState<'basic' | 'media' | 'variants' | 'pricing' | 'seo'>('basic')

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [variants, setVariants] = useState<Variant[]>([{
    id: crypto.randomUUID(),
    sku: '',
    name: '',
    size: '',
    color: '',
    colorHex: '',
    priceDelta: 0,
    weight: null,
    stock: 0,
  }])

  // Generate variants from sizes × colors
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<{ name: string; hex: string }[]>([])

  const generateVariants = useCallback(() => {
    if (!selectedSizes.length && !selectedColors.length) return

    const generated: Variant[] = []
    const sizes = selectedSizes.length > 0 ? selectedSizes : ['']
    const colors = selectedColors.length > 0 ? selectedColors : [{ name: '', hex: '' }]

    for (const size of sizes) {
      for (const color of colors) {
        const skuParts = [name.slice(0, 3).toUpperCase(), size, color.name.slice(0, 3).toUpperCase()].filter(Boolean)
        generated.push({
          id: crypto.randomUUID(),
          sku: `${skuParts.join('-')}-${Date.now().toString(36).slice(-4)}`,
          name: [size, color.name].filter(Boolean).join(' / '),
          size,
          color: color.name,
          colorHex: color.hex,
          priceDelta: 0,
          weight: null,
          stock: 0,
        })
      }
    }
    setVariants(generated)
    toast.success(`Generated ${generated.length} variants`)
  }, [selectedSizes, selectedColors, name])

  const addVariant = useCallback(() => {
    setVariants(prev => [...prev, {
      id: crypto.randomUUID(),
      sku: '',
      name: '',
      size: '',
      color: '',
      colorHex: '',
      priceDelta: 0,
      weight: null,
      stock: 0,
    }])
  }, [])

  const removeVariant = useCallback((id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id))
  }, [])

  const updateVariant = useCallback((id: string, field: keyof Variant, value: any) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v))
  }, [])

  const handleSave = useCallback(async (asDraft = false) => {
    if (!name.trim()) { toast.error('Product name is required'); return }
    if (!basePrice) { toast.error('Base price is required'); return }
    if (!variants.length || !variants[0].sku) { toast.error('At least one variant with SKU is required'); return }

    setSaving(true)
    try {
      // Create product
      const res = await fetch('/api/portal/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          isActive: asDraft ? false : isActive,
          metaTitle,
          metaDescription,
          variants: variants.map((v, i) => ({
            sku: v.sku,
            name: v.name || undefined,
            size: v.size || undefined,
            color: v.color || undefined,
            colorHex: v.colorHex || undefined,
            priceDelta: v.priceDelta,
            weight: v.weight || undefined,
            sortOrder: i,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.message || 'Failed to create product')
        return
      }

      const { data } = await res.json()

      // Upload media associations
      if (images.length > 0) {
        await fetch(`/api/portal/products/${data.id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media: images.filter(img => !img.uploading).map((img, i) => ({
              url: img.url,
              isPrimary: img.isPrimary,
              sortOrder: i,
            })),
          }),
        })
      }

      toast.success(asDraft ? 'Product saved as draft' : 'Product created successfully')
      router.push('/admin/dashboard/products')
    } catch (err) {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }, [name, description, shortDescription, brand, categoryId, basePrice, salePrice, costPrice, isFeatured, isActive, metaTitle, metaDescription, images, variants, router])

  const sections = [
    { key: 'basic', label: 'Basic Info', icon: Package },
    { key: 'media', label: 'Media', icon: Eye },
    { key: 'variants', label: 'Variants', icon: Ruler },
    { key: 'pricing', label: 'Pricing', icon: Tag },
    { key: 'seo', label: 'SEO', icon: Tag },
  ] as const

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-[var(--portal-elevated)]" style={{ color: 'var(--portal-muted)' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Add Product</h1>
              <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Create a new product with variants and media</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClayButton variant="ghost" size="sm" onClick={() => handleSave(true)} disabled={saving}>
              Save as Draft
            </ClayButton>
            <ClayButton variant="primary" size="sm" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Publish Product
            </ClayButton>
          </div>
        </motion.div>

        {/* Section Tabs */}
        <motion.div variants={fadeUpVariants} className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSection === s.key ? 'shadow-sm' : 'hover:opacity-80'
              }`}
              style={{
                background: activeSection === s.key ? 'var(--portal-surface)' : 'transparent',
                color: activeSection === s.key ? 'var(--portal-accent)' : 'var(--portal-muted)',
              }}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </motion.div>

        {/* ─── BASIC INFO ─── */}
        {activeSection === 'basic' && (
          <motion.div variants={fadeUpVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <FormCard title="Product Information">
                <FormField label="Product Name" required>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Silk Saree with Golden Border"
                    className="portal-input"
                  />
                </FormField>
                <FormField label="Short Description">
                  <input
                    value={shortDescription}
                    onChange={e => setShortDescription(e.target.value)}
                    placeholder="Brief one-liner for listings"
                    className="portal-input"
                  />
                </FormField>
                <FormField label="Full Description">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Detailed product description with fabric, care instructions, etc."
                    rows={6}
                    className="portal-input resize-none"
                  />
                </FormField>
              </FormCard>
            </div>

            <div className="space-y-4">
              <FormCard title="Organization">
                <FormField label="Brand">
                  <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Aprdite" className="portal-input" />
                </FormField>
                <FormField label="Category">
                  <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="portal-input">
                    <option value="">Select category</option>
                    {categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Status">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
                      <span className="text-sm" style={{ color: 'var(--portal-text)' }}>Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded" />
                      <span className="text-sm" style={{ color: 'var(--portal-text)' }}>Featured</span>
                    </label>
                  </div>
                </FormField>
              </FormCard>
            </div>
          </motion.div>
        )}

        {/* ─── MEDIA ─── */}
        {activeSection === 'media' && (
          <motion.div variants={fadeUpVariants}>
            <FormCard title="Product Images">
              <ImageUploader images={images} onChange={setImages} maxImages={10} folder="products" />
            </FormCard>
          </motion.div>
        )}

        {/* ─── VARIANTS ─── */}
        {activeSection === 'variants' && (
          <motion.div variants={fadeUpVariants} className="space-y-4">
            {/* Quick Generator */}
            <FormCard title="Quick Variant Generator">
              <div className="space-y-4">
                <FormField label="Sizes">
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSizes(prev =>
                          prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                        )}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          selectedSizes.includes(size)
                            ? 'border-[var(--portal-accent)] text-[var(--portal-accent)] bg-[var(--portal-accent)]/10'
                            : 'border-[var(--portal-border)] hover:border-[var(--portal-accent)]/50'
                        }`}
                        style={{ color: selectedSizes.includes(size) ? 'var(--portal-accent)' : 'var(--portal-text)' }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </FormField>

                <FormField label="Colors">
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setSelectedColors(prev =>
                          prev.some(c => c.hex === color.hex)
                            ? prev.filter(c => c.hex !== color.hex)
                            : [...prev, color]
                        )}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          selectedColors.some(c => c.hex === color.hex)
                            ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10'
                            : 'border-[var(--portal-border)] hover:border-[var(--portal-accent)]/50'
                        }`}
                        style={{ color: 'var(--portal-text)' }}
                      >
                        <span className="w-3 h-3 rounded-full border border-gray-300" style={{ background: color.hex }} />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </FormField>

                <ClayButton variant="secondary" size="sm" onClick={generateVariants}>
                  <Palette size={14} /> Generate {(selectedSizes.length || 1) * (selectedColors.length || 1)} Variants
                </ClayButton>
              </div>
            </FormCard>

            {/* Variants Table */}
            <FormCard title={`Variants (${variants.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      {['SKU', 'Name', 'Size', 'Color', 'Price Δ', 'Weight (g)', 'Stock', ''].map(h => (
                        <th key={h} className="text-left px-2 py-2 text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                        <td className="px-2 py-2">
                          <input value={v.sku} onChange={e => updateVariant(v.id, 'sku', e.target.value)} className="portal-input-sm w-32" placeholder="SKU-001" />
                        </td>
                        <td className="px-2 py-2">
                          <input value={v.name} onChange={e => updateVariant(v.id, 'name', e.target.value)} className="portal-input-sm w-28" placeholder="Variant name" />
                        </td>
                        <td className="px-2 py-2">
                          <select value={v.size} onChange={e => updateVariant(v.id, 'size', e.target.value)} className="portal-input-sm w-20">
                            <option value="">-</option>
                            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            {v.colorHex && <span className="w-3 h-3 rounded-full border" style={{ background: v.colorHex }} />}
                            <input value={v.color} onChange={e => updateVariant(v.id, 'color', e.target.value)} className="portal-input-sm w-20" placeholder="Color" />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={v.priceDelta} onChange={e => updateVariant(v.id, 'priceDelta', parseFloat(e.target.value) || 0)} className="portal-input-sm w-20" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={v.weight ?? ''} onChange={e => updateVariant(v.id, 'weight', e.target.value ? parseFloat(e.target.value) : null)} className="portal-input-sm w-20" placeholder="g" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" value={v.stock} onChange={e => updateVariant(v.id, 'stock', parseInt(e.target.value) || 0)} className="portal-input-sm w-16" />
                        </td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => removeVariant(v.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addVariant} className="mt-3 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-[var(--portal-border)] hover:border-[var(--portal-accent)] transition-colors" style={{ color: 'var(--portal-muted)' }}>
                <Plus size={12} /> Add Variant
              </button>
            </FormCard>
          </motion.div>
        )}

        {/* ─── PRICING ─── */}
        {activeSection === 'pricing' && (
          <motion.div variants={fadeUpVariants}>
            <FormCard title="Pricing">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Base Price (₹)" required>
                  <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="999" className="portal-input" />
                </FormField>
                <FormField label="Sale Price (₹)">
                  <input type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} placeholder="799" className="portal-input" />
                </FormField>
                <FormField label="Cost Price (₹)">
                  <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="400" className="portal-input" />
                </FormField>
              </div>
              {basePrice && salePrice && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
                  <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                    Discount: <span className="font-bold text-green-400">{Math.round((1 - parseFloat(salePrice) / parseFloat(basePrice)) * 100)}% off</span>
                    {costPrice && (
                      <> • Margin: <span className="font-bold text-blue-400">{Math.round((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(salePrice) * 100)}%</span></>
                    )}
                  </p>
                </div>
              )}
            </FormCard>
          </motion.div>
        )}

        {/* ─── SEO ─── */}
        {activeSection === 'seo' && (
          <motion.div variants={fadeUpVariants}>
            <FormCard title="Search Engine Optimization">
              <FormField label="Meta Title">
                <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder={name || 'Product title for search engines'} className="portal-input" />
                <p className="text-[10px] mt-1" style={{ color: 'var(--portal-muted)' }}>{(metaTitle || name).length}/60 characters</p>
              </FormField>
              <FormField label="Meta Description">
                <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="Brief description for search engine results" rows={3} className="portal-input resize-none" />
                <p className="text-[10px] mt-1" style={{ color: 'var(--portal-muted)' }}>{metaDescription.length}/160 characters</p>
              </FormField>
              {/* Preview */}
              <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--portal-muted)' }}>Search Preview</p>
                <p className="text-sm font-medium text-blue-400 truncate">{metaTitle || name || 'Product Title'}</p>
                <p className="text-xs text-green-500 truncate">aprdite.com/product/{name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'slug'}</p>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--portal-muted)' }}>{metaDescription || shortDescription || 'Product description will appear here...'}</p>
              </div>
            </FormCard>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}

// ─── Helper Components ─────────────────────────────────────────────

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
