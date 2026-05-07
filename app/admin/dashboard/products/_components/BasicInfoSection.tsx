'use client'
import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { X } from 'lucide-react'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const PRODUCT_TYPES = [
  { value: 'VARIABLE', label: 'Variable', desc: 'Has size/color variants' },
  { value: 'SINGLE', label: 'Single', desc: 'One SKU, no variants' },
  { value: 'BUNDLE', label: 'Bundle', desc: 'Combination of products' },
  { value: 'DIGITAL', label: 'Digital', desc: 'No shipping required' },
]

const FABRIC_TYPES = [
  'Cotton', 'Polyester', 'Silk', 'Linen', 'Wool', 'Rayon', 'Denim',
  'Chiffon', 'Georgette', 'Velvet', 'Nylon', 'Blended', 'Other',
]

export interface BasicInfoValues {
  name: string
  slug: string
  shortDescription: string
  categoryId: string
  productType: string
  fabricType: string
  fabricQuality: string
  brand: string
  tags: string[]
  isFeatured: boolean
  isPublished: boolean
}

interface BasicInfoSectionProps {
  values: BasicInfoValues
  onChange: (values: BasicInfoValues) => void
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function BasicInfoSection({ values, onChange }: BasicInfoSectionProps) {
  const { data: categories } = useSWR('/api/storefront/categories', fetcher)
  const [tagInput, setTagInput] = useState('')

  const set = useCallback(<K extends keyof BasicInfoValues>(key: K, val: BasicInfoValues[K]) => {
    const next = { ...values, [key]: val }
    if (key === 'name') next.slug = slugify(val as string)
    onChange(next)
  }, [values, onChange])

  const addTag = useCallback(() => {
    const t = tagInput.trim()
    if (t && !values.tags.includes(t)) {
      set('tags', [...values.tags, t])
    }
    setTagInput('')
  }, [tagInput, values.tags, set])

  const removeTag = useCallback((tag: string) => {
    set('tags', values.tags.filter(t => t !== tag))
  }, [values.tags, set])

  return (
    <div className="space-y-6">
      {/* ── Row 1: Name + Slug ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title="Product Information">
            <Field label="Product Name" required>
              <input
                value={values.name}
                onChange={e => set('name', e.target.value)}
                onBlur={() => { if (!values.slug && values.name) set('slug', slugify(values.name)) }}
                placeholder="e.g. Premium Banarasi Silk Saree"
                className="portal-input"
              />
              {values.slug && (
                <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--portal-muted)' }}>
                  Slug: <span style={{ color: 'var(--portal-text)' }}>{values.slug}</span>
                </p>
              )}
            </Field>

            <Field label="Short Description" hint={`${(values.shortDescription || '').length}/300`}>
              <textarea
                value={values.shortDescription}
                onChange={e => { if (e.target.value.length <= 300) set('shortDescription', e.target.value) }}
                placeholder="Brief one-liner for cards and listings (max 300 chars)"
                rows={2}
                className="portal-input resize-none"
              />
            </Field>

            <Field label="Brand">
              <input value={values.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Aprdite" className="portal-input" />
            </Field>
          </SectionCard>

          {/* Tags */}
          <SectionCard title="Tags & Keywords">
            {values.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {values.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(214,51,108,0.12)', color: 'var(--portal-accent)', border: '1px solid rgba(214,51,108,0.25)' }}>
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Type a tag and press Enter"
                className="portal-input flex-1"
              />
              <button type="button" onClick={addTag} className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', border: '1px solid var(--portal-border)' }}>
                Add
              </button>
            </div>
          </SectionCard>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          <SectionCard title="Classification">
            <Field label="Product Type">
              <div className="space-y-2">
                {PRODUCT_TYPES.map(pt => (
                  <label key={pt.value} className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${values.productType === pt.value ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/5' : 'border-transparent hover:bg-[var(--portal-elevated)]'}`}>
                    <input type="radio" name="productType" value={pt.value} checked={values.productType === pt.value} onChange={() => set('productType', pt.value)} className="mt-0.5 accent-[var(--portal-accent)]" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>{pt.label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{pt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Category">
              <select value={values.categoryId} onChange={e => set('categoryId', e.target.value)} className="portal-input">
                <option value="">Select category</option>
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </Field>
          </SectionCard>

          <SectionCard title="Fabric & Material">
            <Field label="Fabric Type">
              <select value={values.fabricType} onChange={e => set('fabricType', e.target.value)} className="portal-input">
                <option value="">Select fabric</option>
                {FABRIC_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Fabric Quality">
              <input value={values.fabricQuality} onChange={e => set('fabricQuality', e.target.value)} placeholder='e.g. "280 GSM", "Double Ply"' className="portal-input" />
            </Field>
          </SectionCard>

          <SectionCard title="Visibility">
            <Toggle label="Published (visible on store)" checked={values.isPublished} onChange={v => set('isPublished', v)} />
            <Toggle label="Featured (homepage highlight)" checked={values.isFeatured} onChange={v => set('isFeatured', v)} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// ─── Shared sub-components ─────────────────────────────────────────

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--portal-text)' }}>{title}</h3>
      {children}
    </div>
  )
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {hint && <span className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer p-2.5 rounded-xl hover:bg-[var(--portal-elevated)] transition-colors">
      <span className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>{label}</span>
      <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-[var(--portal-accent)]' : 'bg-gray-600'}`} onClick={() => onChange(!checked)}>
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
    </label>
  )
}
