'use client'
import { useCallback } from 'react'
import { SectionCard, Field } from './BasicInfoSection'

export interface SeoValues {
  metaTitle: string
  metaDescription: string
}

interface SeoSectionProps {
  productName: string
  productSlug: string
  shortDescription: string
  values: SeoValues
  onChange: (values: SeoValues) => void
}

export function SeoSection({ productName, productSlug, shortDescription, values, onChange }: SeoSectionProps) {
  const set = useCallback(<K extends keyof SeoValues>(key: K, val: SeoValues[K]) => {
    onChange({ ...values, [key]: val })
  }, [values, onChange])

  const titleLen = (values.metaTitle || productName || '').length
  const descLen = values.metaDescription.length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <SectionCard title="Search Engine Optimization">
          <Field label="Meta Title" hint={`${titleLen}/60`}>
            <input
              value={values.metaTitle}
              onChange={e => set('metaTitle', e.target.value)}
              placeholder={productName || 'Product title for search engines'}
              className="portal-input"
            />
            {!values.metaTitle && productName && (
              <button type="button" onClick={() => set('metaTitle', productName)} className="text-[10px] font-medium mt-1" style={{ color: 'var(--portal-accent)' }}>
                Use product name
              </button>
            )}
            {titleLen > 60 && <p className="text-[10px] text-red-400 mt-0.5">Title is too long — Google will truncate it</p>}
          </Field>

          <Field label="Meta Description" hint={`${descLen}/160`}>
            <textarea
              value={values.metaDescription}
              onChange={e => set('metaDescription', e.target.value)}
              placeholder="Brief description for search results"
              rows={3}
              className="portal-input resize-none"
            />
            {descLen > 160 && <p className="text-[10px] text-red-400 mt-0.5">Description is too long — Google will truncate it</p>}
          </Field>
        </SectionCard>
      </div>

      {/* Google Search Preview */}
      <div className="space-y-5">
        <SectionCard title="Google Search Preview">
          <div className="p-5 rounded-xl" style={{ background: '#fff' }}>
            <p className="text-[13px] font-medium text-[#1a0dab] truncate leading-snug">
              {values.metaTitle || productName || 'Product Title'}
            </p>
            <p className="text-[11px] text-[#006621] truncate mt-0.5">
              aprdite.com/product/{productSlug || 'product-slug'}
            </p>
            <p className="text-[11px] text-[#545454] mt-1 line-clamp-2 leading-relaxed">
              {values.metaDescription || shortDescription || 'Product description will appear here in search results...'}
            </p>
          </div>
        </SectionCard>

        <SectionCard title="SEO Checklist">
          <div className="space-y-2">
            {[
              { label: 'Meta title is set', done: !!(values.metaTitle || productName) },
              { label: 'Meta title ≤ 60 chars', done: titleLen > 0 && titleLen <= 60 },
              { label: 'Meta description is set', done: !!values.metaDescription },
              { label: 'Meta description ≤ 160 chars', done: descLen > 0 && descLen <= 160 },
              { label: 'Product has a slug', done: !!productSlug },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.done ? 'bg-green-400' : 'bg-gray-500'}`} />
                <span className="text-[10px]" style={{ color: item.done ? 'var(--portal-text)' : 'var(--portal-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
