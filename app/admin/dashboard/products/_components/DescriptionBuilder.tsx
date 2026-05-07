'use client'
import { useState, useCallback, useMemo } from 'react'
import { Plus, X, Eye, Code, Sparkles, Copy, Check, Image as ImageIcon } from 'lucide-react'
import { SectionCard, Field } from './BasicInfoSection'
import { UploadedImage } from '@/components/portal/products/ImageUploader'
import { ImageUploader } from '@/components/portal/products/ImageUploader'

const OCCASIONS = ['Casual', 'Formal', 'Wedding', 'Party', 'Festive', 'Office', 'Beach', 'Travel', 'Sports', 'Everyday']
const CARE_PRESETS = ['Machine wash cold', 'Hand wash only', 'Dry clean only', 'Do not bleach', 'Iron low heat', 'Do not iron', 'Tumble dry low', 'Hang dry', 'Do not wring', 'Wash inside out']

export interface DescriptionValues {
  fullDescription: string
  keyFeatures: string[]
  usageOccasion: string[]
  careInstructions: string[]
  productImages: UploadedImage[]
}

interface DescriptionBuilderProps {
  productName: string
  fabricType: string
  fabricQuality: string
  values: DescriptionValues
  onChange: (values: DescriptionValues) => void
}

export function DescriptionBuilder({ productName, fabricType, fabricQuality, values, onChange }: DescriptionBuilderProps) {
  const [featureInput, setFeatureInput] = useState('')
  const [careInput, setCareInput] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [copied, setCopied] = useState(false)

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

  // ── Generate 50-sentence blog-style HTML with product images ──
  const generatedHtml = useMemo(() => {
    const name = productName || 'Your Product'
    const fabric = [fabricType, fabricQuality].filter(Boolean).join(' — ')
    const features = values.keyFeatures
    const occasions = values.usageOccasion
    const care = values.careInstructions
    const images = values.productImages.filter(img => !img.uploading && img.url)

    // Build image gallery HTML
    const galleryHtml = images.length > 0
      ? `<section class="pd-gallery">
    <div class="pd-gallery__grid">
${images.map((img, i) => `      <img src="${esc(img.url)}" alt="${esc(name)} - Image ${i + 1}" class="pd-gallery__img" />`).join('\n')}
    </div>
  </section>`
      : ''

    // Build featured image for hero
    const heroImg = images.length > 0
      ? `<div class="pd-hero__img"><img src="${esc(images[0].url)}" alt="${esc(name)}" /></div>`
      : ''

    // Mid-section images
    const midImg = images.length > 1
      ? `<div class="pd-mid-img"><img src="${esc(images[1].url)}" alt="${esc(name)} detail" /></div>`
      : ''

    const endImg = images.length > 2
      ? `<div class="pd-end-img"><img src="${esc(images[2].url)}" alt="${esc(name)} lifestyle" /></div>`
      : ''

    // Generate rich prose paragraphs (50+ sentences)
    const introSentences = [
      `Introducing the ${esc(name)} — a masterpiece of design and craftsmanship that redefines what it means to dress with intention.`,
      `Every detail has been thoughtfully considered, from the initial sketch to the final stitch, creating a piece that speaks volumes about your taste.`,
      `This is not just another addition to your wardrobe; it is a statement of individuality, confidence, and refined aesthetics.`,
      fabric ? `Crafted from premium ${esc(fabric)}, this piece offers an unmatched combination of comfort and durability that you will feel from the very first wear.` : `Crafted from premium materials carefully selected for their quality, this piece delivers exceptional comfort and lasting durability.`,
      `The attention to detail is evident in every seam, every fold, and every carefully placed element that makes this product truly exceptional.`,
      `We believe that great fashion should feel as good as it looks, and this piece delivers on that promise in every possible way.`,
    ]

    const storySentences = [
      `Born from a vision of timeless elegance meets modern sensibility, this design bridges the gap between classic sophistication and contemporary style.`,
      `Our design team spent countless hours perfecting the silhouette, ensuring that it flatters every body type while maintaining its distinctive character.`,
      `The color palette was chosen to complement a wide range of existing wardrobe pieces, making it incredibly versatile for any occasion.`,
      `Whether you are stepping out for a casual brunch or preparing for an important evening event, this piece adapts effortlessly to your needs.`,
      `The construction technique used ensures longevity — this is a piece built to withstand the test of time and maintain its beauty wash after wash.`,
      `We sourced the finest materials from trusted suppliers who share our commitment to quality and ethical production practices.`,
      fabric ? `The ${esc(fabricType || 'fabric')} undergoes rigorous quality checks at every stage of production to ensure only the best reaches your hands.` : `Every material undergoes rigorous quality checks at every stage of production to ensure only the best reaches your hands.`,
      `The weight and drape of the fabric create a natural flow that moves beautifully with your body, offering both comfort and style in equal measure.`,
    ]

    const featureSentences = features.length > 0
      ? features.map(f => `One of the standout qualities is the ${esc(f)}, which sets this piece apart from anything else in the market.`)
      : [
        `The unique design elements create a distinctive silhouette that catches the eye without being overwhelming.`,
        `Thoughtful construction details ensure comfort throughout the day, no matter how long you wear it.`,
        `The versatile design allows you to dress it up with accessories or keep it minimal for a clean, understated look.`,
      ]

    const occasionSentences = occasions.length > 0
      ? [
        `This piece is perfectly suited for ${occasions.map(o => esc(o).toLowerCase()).join(', ')} occasions, making it a truly versatile investment.`,
        `Imagine wearing this to your next ${esc(occasions[0]?.toLowerCase() || 'special')} gathering and receiving compliments from everyone in the room.`,
        `The design versatility means you can transition seamlessly from ${occasions.length > 1 ? esc(occasions[0]?.toLowerCase() || 'day') + ' to ' + esc(occasions[1]?.toLowerCase() || 'evening') : 'day to evening'} without missing a beat.`,
        `Style it differently for each occasion — it transforms beautifully whether you are going for relaxed or refined.`,
      ]
      : [
        `Designed for the modern individual who refuses to compromise between style and practicality.`,
        `Equally at home in professional settings as it is during leisure time, making it an indispensable wardrobe staple.`,
        `The kind of piece that makes getting dressed in the morning effortless — you already know it will look amazing.`,
        `Perfect for those who appreciate quality craftsmanship and want their clothing to reflect their standards.`,
      ]

    const qualitySentences = [
      `Quality is not just a word we use — it is embedded in every fiber of this product.`,
      `The stitching is reinforced at all stress points, ensuring that the garment maintains its shape and structure over extended use.`,
      `Color fastness has been tested rigorously — the vibrant hues will remain true even after multiple washes.`,
      `The finishing touches, including the trims and closures, are selected for both functionality and aesthetic harmony.`,
      `We stand behind our products with confidence, knowing that the craftsmanship speaks for itself.`,
      `Each piece goes through a final quality inspection before being packaged and shipped to ensure it meets our exacting standards.`,
    ]

    const lifestyleSentences = [
      `Owning this piece means owning a part of a larger story — one of craftsmanship, passion, and dedication to excellence.`,
      `It is the kind of addition that elevates not just your outfit but your entire presence in any room you walk into.`,
      `Pair it with your favorite accessories to create looks that range from effortlessly casual to impeccably polished.`,
      `The silhouette has been designed to photograph beautifully, whether for social media or cherished memories.`,
      `Invest in pieces that make you feel extraordinary — because you deserve nothing less than exceptional.`,
      `This is fashion designed with purpose, intention, and an unwavering commitment to making you look and feel your best.`,
    ]

    const closingSentences = [
      `Add this to your collection today and experience the difference that true quality makes.`,
      `Join thousands of satisfied customers who have made this one of our most celebrated pieces.`,
      `Limited quantities available — once you experience the quality, you will understand why.`,
      `Your wardrobe deserves this upgrade. You deserve this level of quality and craftsmanship.`,
      `Order now and discover what thoughtful design and premium craftsmanship truly feel like.`,
    ]

    const careSentences = care.length > 0
      ? [
        `To maintain the exceptional quality of your ${esc(name)}, we recommend the following care instructions:`,
        ...care.map(c => `${esc(c)}.`),
        `Following these simple guidelines will ensure your piece remains beautiful for years to come.`,
        `Proper care extends the life of your garment significantly, preserving both the fabric integrity and vibrant appearance.`,
      ]
      : []

    return `<article class="pd-desc">
  <header class="pd-hero">
    ${heroImg}
    <div class="pd-hero__content">
      <h1>${esc(name)}</h1>
      ${fabric ? `<p class="pd-tagline">${esc(fabric)}</p>` : ''}
    </div>
  </header>

  <section class="pd-intro">
    <h2>A New Standard of Excellence</h2>
${introSentences.map(s => `    <p>${s}</p>`).join('\n')}
  </section>

  ${galleryHtml}

  <section class="pd-story">
    <h2>The Story Behind the Design</h2>
${storySentences.map(s => `    <p>${s}</p>`).join('\n')}
  </section>

  ${midImg}

  <section class="pd-features">
    <h2>What Makes It Special</h2>
${featureSentences.map(s => `    <p>${s}</p>`).join('\n')}
    ${features.length > 0 ? `<ul class="pd-feature-list">
${features.map(f => `      <li><strong>${esc(f)}</strong></li>`).join('\n')}
    </ul>` : ''}
  </section>

  <section class="pd-occasions">
    <h2>Perfect For Every Moment</h2>
${occasionSentences.map(s => `    <p>${s}</p>`).join('\n')}
    ${occasions.length > 0 ? `<div class="pd-tags">${occasions.map(o => `<span class="pd-tag">${esc(o)}</span>`).join(' ')}</div>` : ''}
  </section>

  ${endImg}

  <section class="pd-quality">
    <h2>Uncompromising Quality</h2>
${qualitySentences.map(s => `    <p>${s}</p>`).join('\n')}
  </section>

  <section class="pd-lifestyle">
    <h2>Elevate Your Style</h2>
${lifestyleSentences.map(s => `    <p>${s}</p>`).join('\n')}
  </section>

  ${careSentences.length > 0 ? `<section class="pd-care">
    <h2>Care Instructions</h2>
${careSentences.map(s => `    <p>${s}</p>`).join('\n')}
  </section>` : ''}

  <section class="pd-closing">
    <h2>Make It Yours</h2>
${closingSentences.map(s => `    <p>${s}</p>`).join('\n')}
  </section>
</article>`
  }, [productName, fabricType, fabricQuality, values])

  // Use generated
  const useGenerated = useCallback(() => {
    set('fullDescription', generatedHtml)
  }, [generatedHtml, set])

  const copyHtml = useCallback(() => {
    navigator.clipboard.writeText(generatedHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generatedHtml])

  // Preview CSS
  const previewCss = `
    * { box-sizing: border-box; }
    .pd-desc { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; max-width: 720px; margin: 0 auto; padding: 32px 24px; line-height: 1.7; }
    .pd-hero { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
    .pd-hero__img img { width: 100%; height: 400px; object-fit: cover; border-radius: 16px; }
    .pd-hero h1 { font-size: 2rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
    .pd-tagline { font-size: 1rem; color: #666; margin: 4px 0 0; font-style: italic; }
    .pd-intro, .pd-story, .pd-features, .pd-occasions, .pd-quality, .pd-lifestyle, .pd-care, .pd-closing { margin-top: 36px; }
    .pd-intro h2, .pd-story h2, .pd-features h2, .pd-occasions h2, .pd-quality h2, .pd-lifestyle h2, .pd-care h2, .pd-closing h2 { font-size: 1.3rem; font-weight: 700; margin-bottom: 12px; color: #2d2d4e; }
    .pd-intro p, .pd-story p, .pd-features p, .pd-occasions p, .pd-quality p, .pd-lifestyle p, .pd-care p, .pd-closing p { font-size: 0.92rem; color: #444; margin-bottom: 10px; }
    .pd-feature-list { padding-left: 20px; margin-top: 12px; }
    .pd-feature-list li { margin-bottom: 8px; font-size: 0.9rem; }
    .pd-gallery { margin: 32px 0; }
    .pd-gallery__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .pd-gallery__img { width: 100%; height: 220px; object-fit: cover; border-radius: 12px; }
    .pd-mid-img img, .pd-end-img img { width: 100%; height: 320px; object-fit: cover; border-radius: 14px; margin: 24px 0; }
    .pd-tags { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
    .pd-tag { display: inline-block; padding: 4px 14px; border-radius: 24px; background: #f0e6ff; color: #6b21a8; font-size: 0.8rem; font-weight: 600; }
  `

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Inputs */}
      <div className="space-y-5">
        {/* Product Images for Blog */}
        <SectionCard title="Product Images (for description blog)">
          <p className="text-[10px] mb-2" style={{ color: 'var(--portal-muted)' }}>
            Upload product images here. These will be embedded in the generated 50-sentence product description blog.
          </p>
          <ImageUploader
            images={values.productImages}
            onChange={imgs => set('productImages', imgs)}
            maxImages={10}
            folder="products/description"
          />
          {values.productImages.length > 0 && (
            <p className="text-[10px] mt-2" style={{ color: 'var(--portal-muted)' }}>
              <ImageIcon size={10} className="inline mr-1" />{values.productImages.filter(i => !i.uploading).length} images will be used in the blog
            </p>
          )}
        </SectionCard>

        <SectionCard title="Key Features">
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

        {/* Manual override */}
        <SectionCard title="Manual Description Override">
          <Field label="Full Description HTML" hint="Raw HTML (overrides generated blog)">
            <textarea
              value={values.fullDescription}
              onChange={e => set('fullDescription', e.target.value)}
              placeholder="Paste or edit HTML directly. Leave empty to use the generated 50-sentence blog above."
              rows={6}
              className="portal-input resize-none font-mono text-[11px]"
            />
          </Field>
        </SectionCard>
      </div>

      {/* Right: Live Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showPreview ? 'bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]' : ''}`}
              style={{ color: showPreview ? undefined : 'var(--portal-muted)' }}
            >
              <Eye size={12} /> Preview
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!showPreview ? 'bg-[var(--portal-accent)]/10 text-[var(--portal-accent)]' : ''}`}
              style={{ color: !showPreview ? undefined : 'var(--portal-muted)' }}
            >
              <Code size={12} /> HTML
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={copyHtml} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium hover:bg-[var(--portal-elevated)]" style={{ color: 'var(--portal-muted)' }}>
              {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" onClick={useGenerated} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--portal-accent)] text-white">
              <Sparkles size={10} /> Use This Blog
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--portal-border)', minHeight: 600 }}>
          {showPreview ? (
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><style>${previewCss}</style></head><body style="margin:0;padding:0;background:#fff">${values.fullDescription || generatedHtml}</body></html>`}
              className="w-full border-0"
              style={{ minHeight: 600, background: '#fff' }}
              title="Description Blog Preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <pre className="p-4 text-[11px] font-mono overflow-auto" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-text)', minHeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {values.fullDescription || generatedHtml}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
