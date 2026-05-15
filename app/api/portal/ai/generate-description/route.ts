export const runtime = 'nodejs'

import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { z } from 'zod'

const bodySchema = z.object({
  productName: z.string().min(1),
  brand: z.string().optional(),
  fabric: z.string().optional(),
  keyFeatures: z.array(z.string()).default([]),
  occasions: z.array(z.string()).default([]),
  careInstructions: z.array(z.string()).default([]),
  style: z.enum(['luxury', 'casual', 'minimal', 'detailed']).default('detailed'),
})

// ── Local AI Description Generator ──
// Generates rich, unique, non-copyrighted product descriptions using
// intelligent template composition with randomized sentence structures.
// No external API needed — runs entirely on-server.

function generateDescription(data: z.infer<typeof bodySchema>): string {
  const name = esc(data.productName)
  const brand = data.brand ? esc(data.brand) : ''
  const fabric = data.fabric ? esc(data.fabric) : ''
  const features = data.keyFeatures.map(esc)
  const occasions = data.occasions.map(esc)
  const care = data.careInstructions.map(esc)
  const isLuxury = data.style === 'luxury'
  const isMinimal = data.style === 'minimal'

  // Randomized sentence pools for unique descriptions
  const introPool = [
    `Discover the ${name} — where thoughtful design meets everyday elegance.`,
    `The ${name} is crafted for those who believe great style should never be complicated.`,
    `Introducing ${name}: a piece that effortlessly combines form, function, and flair.`,
    `Meet your new wardrobe essential. The ${name} was designed to make an impression without trying too hard.`,
    brand ? `From the ateliers of ${brand} comes the ${name} — a testament to refined taste and modern craft.` : `Every element of the ${name} has been considered with care, resulting in a piece that truly stands apart.`,
    `There are garments you wear, and then there are garments that wear well. The ${name} belongs firmly in the latter category.`,
  ]

  const fabricPool = fabric ? [
    `Crafted from premium ${fabric}, the hand-feel is immediately noticeable — soft, substantial, and reassuringly high-quality.`,
    `The ${fabric} construction provides a natural drape and breathability that keeps you comfortable from morning to evening.`,
    `We selected ${fabric} for its balance of durability and luxury. It washes well, wears better, and ages beautifully.`,
    `The fabric story begins with ${fabric} — chosen not just for how it looks, but for how it makes you feel.`,
  ] : [
    `Premium materials were carefully sourced to deliver comfort without compromise.`,
    `The fabric has been selected for its exceptional hand-feel, breathability, and lasting quality.`,
    `Every thread contributes to a garment that maintains its shape, softness, and color integrity over time.`,
  ]

  const featureIntros = [
    `What sets this piece apart:`,
    `Here is what makes the ${name} special:`,
    `Key details that define this piece:`,
  ]

  const featureSentences = features.length > 0
    ? features.map((f, i) => {
      const templates = [
        `<strong>${f}</strong> — a detail that elevates the entire design.`,
        `<strong>${f}</strong> adds both visual interest and practical value.`,
        `The inclusion of <strong>${f}</strong> speaks to the level of thought behind every decision.`,
      ]
      return templates[i % templates.length]
    })
    : []

  const occasionPool = occasions.length > 0
    ? [
      `Style it for ${occasions.join(', ').replace(/, ([^,]*)$/, ' or $1')} occasions — it adapts beautifully to every setting.`,
      `Whether you are dressing for ${occasions[0]?.toLowerCase() || 'a special event'} or keeping things relaxed, this piece transitions with ease.`,
      `The versatility of the ${name} means it moves seamlessly between ${occasions.slice(0, 2).join(' and ').toLowerCase() || 'different'} contexts.`,
      `Pair it with heels for ${occasions[0]?.toLowerCase() || 'evening'} drama or sneakers for effortless off-duty style.`,
    ]
    : [
      `Designed for real life: the kind of piece that works whether you are running errands or meeting friends.`,
      `Its versatile character means endless styling possibilities — dress it up, dress it down, make it yours.`,
    ]

  const qualityPool = [
    `Every seam is reinforced at stress points for longevity that matches the investment.`,
    `Color-fast dyes ensure vibrancy that lasts wash after wash — no fading, no surprises.`,
    `Hardware and finishing touches are selected for both aesthetics and durability.`,
    `The construction reflects a commitment to quality that you can see, feel, and trust.`,
    isLuxury ? `This is the kind of piece that people notice — and remember.` : `Built to be a reliable companion in your daily wardrobe rotation.`,
  ]

  const closingPool = [
    `Add the ${name} to your collection and feel the difference that intentional design makes.`,
    `This is more than a purchase — it is an upgrade to how you present yourself to the world.`,
    `Limited availability. When it is gone, it is gone. Make it yours today.`,
    brand ? `Experience the ${brand} standard of quality and design with the ${name}.` : `Quality this considered does not come around often. Act now.`,
  ]

  const careSection = care.length > 0
    ? `<section class="pd-care">
    <h2>Care Guide</h2>
    <ul class="pd-care-list">
${care.map(c => `      <li>${c}</li>`).join('\n')}
    </ul>
    <p>With proper care, this piece will remain a favourite for years to come.</p>
  </section>` : ''

  // Select sentences based on style
  const pick = <T,>(pool: T[], count: number): T[] => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, pool.length))
  }

  const intros = pick(introPool, isMinimal ? 2 : 4)
  const fabrics = pick(fabricPool, isMinimal ? 1 : 3)
  const occasionSentences = pick(occasionPool, isMinimal ? 1 : 3)
  const quality = pick(qualityPool, isMinimal ? 2 : 4)
  const closing = pick(closingPool, 2)

  const featureHtml = featureSentences.length > 0
    ? `<section class="pd-features">
    <h2>${pick(featureIntros, 1)[0]}</h2>
    <ul class="pd-feature-list">
${featureSentences.map(f => `      <li>${f}</li>`).join('\n')}
    </ul>
  </section>` : ''

  return `<article class="pd-desc">
  <section class="pd-intro">
    <h1>${name}</h1>
${intros.map(s => `    <p>${s}</p>`).join('\n')}
  </section>

  <section class="pd-fabric">
    <h2>Material &amp; Craft</h2>
${fabrics.map(s => `    <p>${s}</p>`).join('\n')}
  </section>

  ${featureHtml}

  <section class="pd-occasions">
    <h2>Wear It Your Way</h2>
${occasionSentences.map(s => `    <p>${s}</p>`).join('\n')}
    ${occasions.length > 0 ? `<div class="pd-tags">${occasions.map(o => `<span class="pd-tag">${o}</span>`).join(' ')}</div>` : ''}
  </section>

  <section class="pd-quality">
    <h2>Built to Last</h2>
${quality.map(s => `    <p>${s}</p>`).join('\n')}
  </section>

  ${careSection}

  <section class="pd-closing">
    <h2>Make It Yours</h2>
${closing.map(s => `    <p>${s}</p>`).join('\n')}
  </section>
</article>`
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(request: Request) {
  const { error } = await requirePermission(request, 'products.edit')
  if (error) return error

  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) return badRequest('Invalid input', parsed.error.flatten())

    const html = generateDescription(parsed.data)
    return ok({ html, style: parsed.data.style })
  } catch (err) {
    console.error('AI description error:', err)
    return serverError()
  }
}
