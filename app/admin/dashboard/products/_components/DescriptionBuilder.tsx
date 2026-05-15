'use client'
import { useState, useCallback } from 'react'
import { Plus, X, Eye, Code, Sparkles, Copy, Check, Loader2, Smartphone, Monitor, Wand2, RotateCcw } from 'lucide-react'
import { SectionCard, Field } from './BasicInfoSection'
import { toast } from 'sonner'

const OCCASIONS = ['Casual', 'Formal', 'Wedding', 'Party', 'Festive', 'Office', 'Beach', 'Travel', 'Sports', 'Everyday']
const CARE_PRESETS = ['Machine wash cold', 'Hand wash only', 'Dry clean only', 'Do not bleach', 'Iron low heat', 'Do not iron', 'Tumble dry low', 'Hang dry', 'Do not wring', 'Wash inside out']
const STYLE_OPTIONS = [
  { value: 'luxury' as const, label: 'Luxury', desc: 'Premium, aspirational tone' },
  { value: 'casual' as const, label: 'Casual', desc: 'Friendly, approachable voice' },
  { value: 'minimal' as const, label: 'Minimal', desc: 'Clean, concise copy' },
  { value: 'detailed' as const, label: 'Detailed', desc: 'Rich, comprehensive' },
]

export interface DescriptionValues {
  fullDescription: string
  keyFeatures: string[]
  usageOccasion: string[]
  careInstructions: string[]
  productImages: never[]
}

interface DescriptionBuilderProps {
  productName: string
  fabricType: string
  fabricQuality: string
  values: DescriptionValues
  onChange: (values: DescriptionValues) => void
}

// ── Responsive preview CSS for desktop and mobile ──
const PREVIEW_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }

  .pd-desc {
    color: #1a1a2e; max-width: 720px; margin: 0 auto; padding: 40px 28px;
    line-height: 1.75; font-size: 15px;
  }

  /* Hero */
  .pd-intro { margin-bottom: 36px; }
  .pd-intro h1 {
    font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 800;
    letter-spacing: -0.03em; line-height: 1.2; margin-bottom: 16px;
    background: linear-gradient(135deg, #1a1a2e 0%, #4a3a6b 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .pd-intro p { color: #555; font-size: 0.95rem; margin-bottom: 12px; }

  /* Sections */
  .pd-fabric, .pd-features, .pd-occasions, .pd-quality, .pd-care, .pd-closing {
    margin-top: 32px; padding-top: 28px; border-top: 1px solid #eee;
  }
  .pd-fabric h2, .pd-features h2, .pd-occasions h2, .pd-quality h2, .pd-care h2, .pd-closing h2 {
    font-size: clamp(1.1rem, 2.5vw, 1.35rem); font-weight: 700;
    margin-bottom: 14px; color: #2d2d4e; letter-spacing: -0.01em;
  }
  .pd-fabric p, .pd-features p, .pd-occasions p, .pd-quality p, .pd-care p, .pd-closing p {
    font-size: 0.92rem; color: #555; margin-bottom: 10px; line-height: 1.7;
  }

  /* Feature list */
  .pd-feature-list {
    list-style: none; padding: 0; margin: 16px 0;
    display: grid; grid-template-columns: 1fr; gap: 10px;
  }
  .pd-feature-list li {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 16px; border-radius: 12px; background: #f8f7ff;
    font-size: 0.88rem; color: #333; border: 1px solid #ede9fe;
  }
  .pd-feature-list li::before {
    content: '\\2713'; flex-shrink: 0; width: 20px; height: 20px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; background: #7c3aed; color: white;
    font-size: 11px; font-weight: 700; margin-top: 1px;
  }
  .pd-feature-list li strong { font-weight: 600; }

  /* Tags */
  .pd-tags { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; }
  .pd-tag {
    display: inline-block; padding: 6px 16px; border-radius: 99px;
    background: linear-gradient(135deg, #f0e6ff 0%, #e8f4f8 100%);
    color: #6b21a8; font-size: 0.78rem; font-weight: 600;
    border: 1px solid #e2d6f5;
  }

  /* Care list */
  .pd-care-list {
    list-style: none; padding: 0; margin: 12px 0;
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }
  .pd-care-list li {
    padding: 10px 14px; border-radius: 10px; background: #fafafa;
    font-size: 0.82rem; color: #555; border: 1px solid #eee;
  }
  .pd-care-list li::before { content: '\\2022 '; color: #7c3aed; font-weight: 700; }

  /* Closing CTA */
  .pd-closing { text-align: center; padding: 32px 20px; background: linear-gradient(180deg, #faf8ff 0%, #f3eeff 100%); border-radius: 16px; margin-top: 36px; border-top: none; }
  .pd-closing h2 { color: #4a3a6b; }
  .pd-closing p { color: #666; }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    .pd-desc { padding: 24px 16px; font-size: 14px; }
    .pd-intro h1 { font-size: 1.5rem; }
    .pd-fabric h2, .pd-features h2, .pd-occasions h2, .pd-quality h2, .pd-care h2, .pd-closing h2 { font-size: 1.1rem; }
    .pd-care-list { grid-template-columns: 1fr; }
    .pd-closing { padding: 24px 16px; }
  }
`

export function DescriptionBuilder({ productName, fabricType, fabricQuality, values, onChange }: DescriptionBuilderProps) {
  const [featureInput, setFeatureInput] = useState('')
  const [careInput, setCareInput] = useState('')
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview')
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop')
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiStyle, setAiStyle] = useState<'luxury' | 'casual' | 'minimal' | 'detailed'>('detailed')

  const set = useCallback(<K extends keyof DescriptionValues>(key: K, val: DescriptionValues[K]) => {
    onChange({ ...values, [key]: val })
  }, [values, onChange])

  const addFeature = useCallback(() => {
    const f = featureInput.trim()
    if (f && !values.keyFeatures.includes(f)) {
      set('keyFeatures', [...values.keyFeatures, f])
    }
    setFeatureInput('')
  }, [featureInput, values.keyFeatures, set])

  const removeFeature = useCallback((f: string) => {
    set('keyFeatures', values.keyFeatures.filter(x => x !== f))
  }, [values.keyFeatures, set])

  const toggleOccasion = useCallback((o: string) => {
    if (values.usageOccasion.includes(o)) {
      set('usageOccasion', values.usageOccasion.filter(x => x !== o))
    } else {
      set('usageOccasion', [...values.usageOccasion, o])
    }
  }, [values.usageOccasion, set])

  const toggleCare = useCallback((c: string) => {
    if (values.careInstructions.includes(c)) {
      set('careInstructions', values.careInstructions.filter(x => x !== c))
    } else {
      set('careInstructions', [...values.careInstructions, c])
    }
  }, [values.careInstructions, set])

  // ── AI Description Generation ──
  const generateAiDescription = useCallback(async () => {
    if (!productName.trim()) {
      toast.error('Enter a product name first')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/portal/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productName: productName.trim(),
          brand: '',
          fabric: [fabricType, fabricQuality].filter(Boolean).join(' '),
          keyFeatures: values.keyFeatures,
          occasions: values.usageOccasion,
          careInstructions: values.careInstructions,
          style: aiStyle,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.message || 'Failed to generate description')
        return
      }

      const { data } = await res.json()
      if (data?.html) {
        set('fullDescription', data.html)
        toast.success('Description generated! Review in the preview panel.')
      } else {
        toast.error('No description returned')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error')
    } finally {
      setGenerating(false)
    }
  }, [productName, fabricType, fabricQuality, values.keyFeatures, values.usageOccasion, values.careInstructions, aiStyle, set])

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(values.fullDescription)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [values.fullDescription])

  const clearDescription = useCallback(() => {
    set('fullDescription', '')
    toast.success('Description cleared')
  }, [set])

  const iframeWidth = deviceMode === 'mobile' ? '375px' : '100%'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ═══ Left: Inputs ═══ */}
      <div className="space-y-5">
        {/* AI Generator Card */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--portal-accent)', background: 'linear-gradient(180deg, rgba(214,51,108,0.04) 0%, var(--portal-surface) 100%)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--portal-border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--portal-accent)' }}>
                <Wand2 size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>AI Description Writer</p>
                <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Generate unique, SEO-friendly product descriptions</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Style selector */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: 'var(--portal-muted)' }}>Writing Style</label>
              <div className="grid grid-cols-2 gap-2">
                {STYLE_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setAiStyle(s.value)}
                    className="text-left px-3 py-2.5 rounded-xl transition-all text-xs"
                    style={{
                      background: aiStyle === s.value ? 'rgba(214,51,108,0.1)' : 'var(--portal-elevated)',
                      border: `1px solid ${aiStyle === s.value ? 'var(--portal-accent)' : 'var(--portal-border)'}`,
                      color: aiStyle === s.value ? 'var(--portal-accent)' : 'var(--portal-text)',
                    }}
                  >
                    <span className="font-bold">{s.label}</span>
                    <span className="block text-[9px] mt-0.5" style={{ color: 'var(--portal-muted)' }}>{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={generateAiDescription}
              disabled={generating || !productName.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'var(--portal-accent)', boxShadow: '0 4px 16px rgba(214,51,108,0.25)' }}
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate AI Description
                </>
              )}
            </button>

            {!productName.trim() && (
              <p className="text-[10px] text-center" style={{ color: 'var(--portal-muted)' }}>
                Fill in the product name in Basic Info first
              </p>
            )}
          </div>
        </div>

        <SectionCard title="Key Features">
          <p className="text-[10px] mb-2" style={{ color: 'var(--portal-muted)' }}>
            Add features before generating — they will be included in the AI description.
          </p>
          {values.keyFeatures.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {values.keyFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
                  <span className="text-xs font-mono w-5 text-center" style={{ color: 'var(--portal-muted)' }}>{i + 1}</span>
                  <span className="text-xs flex-1" style={{ color: 'var(--portal-text)' }}>{f}</span>
                  <button type="button" onClick={() => removeFeature(f)} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={featureInput}
              onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }}
              placeholder="e.g. Handwoven with pure zari thread"
              className="portal-input flex-1"
            />
            <button type="button" onClick={addFeature} className="p-2 rounded-xl" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)' }}><Plus size={16} /></button>
          </div>
        </SectionCard>

        <SectionCard title="Usage / Occasion">
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map(o => (
              <button
                key={o}
                type="button"
                onClick={() => toggleOccasion(o)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  values.usageOccasion.includes(o) ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]' : 'border-[var(--portal-border)]'
                }`}
                style={{ color: values.usageOccasion.includes(o) ? undefined : 'var(--portal-text)' }}
              >
                {o}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Care Instructions">
          <div className="flex flex-wrap gap-2 mb-3">
            {CARE_PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCare(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  values.careInstructions.includes(c) ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]' : 'border-[var(--portal-border)]'
                }`}
                style={{ color: values.careInstructions.includes(c) ? undefined : 'var(--portal-text)' }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={careInput}
              onChange={e => setCareInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const c = careInput.trim()
                  if (c && !values.careInstructions.includes(c)) set('careInstructions', [...values.careInstructions, c])
                  setCareInput('')
                }
              }}
              placeholder="Custom care instruction..."
              className="portal-input flex-1"
            />
          </div>
        </SectionCard>

        {/* Manual HTML edit */}
        <SectionCard title="Edit Description HTML">
          <Field label="Full Description HTML" hint="Edit the generated HTML directly">
            <textarea
              value={values.fullDescription}
              onChange={e => set('fullDescription', e.target.value)}
              placeholder="Click 'Generate AI Description' above, or paste/write HTML manually."
              rows={8}
              className="portal-input resize-y font-mono text-[11px]"
            />
          </Field>
        </SectionCard>
      </div>

      {/* ═══ Right: Live Preview ═══ */}
      <div className="space-y-3">
        {/* Preview controls */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* View mode: Preview / HTML */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: viewMode === 'preview' ? 'var(--portal-surface)' : 'transparent',
                color: viewMode === 'preview' ? 'var(--portal-accent)' : 'var(--portal-muted)',
                boxShadow: viewMode === 'preview' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Eye size={12} /> Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode('html')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: viewMode === 'html' ? 'var(--portal-surface)' : 'transparent',
                color: viewMode === 'html' ? 'var(--portal-accent)' : 'var(--portal-muted)',
                boxShadow: viewMode === 'html' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Code size={12} /> HTML
            </button>
          </div>

          {/* Device toggle + actions */}
          <div className="flex items-center gap-2">
            {viewMode === 'preview' && (
              <div className="flex items-center gap-1 p-0.5 rounded-xl" style={{ background: 'var(--portal-elevated)' }}>
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    background: deviceMode === 'desktop' ? 'var(--portal-surface)' : 'transparent',
                    color: deviceMode === 'desktop' ? 'var(--portal-accent)' : 'var(--portal-muted)',
                  }}
                  title="Desktop preview"
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    background: deviceMode === 'mobile' ? 'var(--portal-surface)' : 'transparent',
                    color: deviceMode === 'mobile' ? 'var(--portal-accent)' : 'var(--portal-muted)',
                  }}
                  title="Mobile preview"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            )}

            {values.fullDescription && (
              <button type="button" onClick={clearDescription} className="p-1.5 rounded-lg hover:bg-white/5 transition-all" style={{ color: 'var(--portal-muted)' }} title="Clear">
                <RotateCcw size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={copyHtml}
              disabled={!values.fullDescription}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-30"
              style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}
            >
              {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Preview frame */}
        <div
          className="rounded-2xl overflow-hidden transition-all"
          style={{
            border: '1px solid var(--portal-border)',
            minHeight: 650,
            background: viewMode === 'preview' ? '#f5f5f5' : 'var(--portal-elevated)',
          }}
        >
          {!values.fullDescription ? (
            <div className="flex flex-col items-center justify-center h-full py-32">
              <Sparkles size={36} style={{ color: 'var(--portal-muted)', opacity: 0.2 }} />
              <p className="text-sm font-medium mt-3" style={{ color: 'var(--portal-muted)' }}>No description yet</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--portal-muted)', opacity: 0.6 }}>
                Use the AI generator or write HTML manually
              </p>
            </div>
          ) : viewMode === 'preview' ? (
            <div className="flex justify-center p-4" style={{ background: '#f0f0f0' }}>
              <div
                className="transition-all duration-300 rounded-xl overflow-hidden shadow-lg"
                style={{
                  width: iframeWidth,
                  maxWidth: '100%',
                  border: deviceMode === 'mobile' ? '8px solid #222' : 'none',
                  borderRadius: deviceMode === 'mobile' ? '24px' : '12px',
                }}
              >
                {deviceMode === 'mobile' && (
                  <div className="h-6 flex items-center justify-center" style={{ background: '#222' }}>
                    <div className="w-16 h-1 rounded-full bg-gray-600" />
                  </div>
                )}
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${PREVIEW_CSS}</style></head><body style="margin:0;padding:0;background:#fff">${values.fullDescription}</body></html>`}
                  className="w-full border-0"
                  style={{ minHeight: deviceMode === 'mobile' ? 580 : 620, background: '#fff' }}
                  title="Description Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <pre
              className="p-4 text-[11px] font-mono overflow-auto"
              style={{ color: 'var(--portal-text)', minHeight: 620, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {values.fullDescription}
            </pre>
          )}
        </div>

        {/* Device label */}
        {viewMode === 'preview' && values.fullDescription && (
          <p className="text-center text-[9px] font-medium" style={{ color: 'var(--portal-muted)' }}>
            {deviceMode === 'mobile' ? 'Mobile Preview (375px)' : 'Desktop Preview'} — This is how it appears on the storefront
          </p>
        )}
      </div>
    </div>
  )
}
