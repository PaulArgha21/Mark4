'use client'
import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { motion, Reorder } from 'framer-motion'
import { Eye, EyeOff, GripVertical, Save, RefreshCw } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

interface Section {
  id: string
  type: string
  isVisible: boolean
  sortOrder: number
  config: Record<string, unknown> | null
}

const SECTION_META: Record<string, { label: string; emoji: string; desc: string }> = {
  HERO_BANNERS:      { label: 'Hero Banners',      emoji: '🖼️',  desc: 'Full-width carousel at the top' },
  STORY_BANNERS:     { label: 'Story Bubbles',     emoji: '📸',  desc: 'Instagram-style circular stories' },
  CATEGORIES:        { label: 'Category Grid',     emoji: '🗂️',  desc: 'Browse by category cards' },
  FLASH_SALE:        { label: 'Flash Sale',        emoji: '⚡',   desc: 'Countdown timer + sale products' },
  NEW_ARRIVALS:      { label: 'New Arrivals',      emoji: '✨',   desc: 'Latest products added' },
  FEATURED_PRODUCTS: { label: 'Featured Products', emoji: '🌟',  desc: 'Hand-picked / ML-curated products' },
  TRENDING:          { label: 'Trending Now',      emoji: '🔥',  desc: 'ML-powered trending products' },
  PROMO_CARDS:       { label: 'Promo Banners',      emoji: '🏷️',  desc: 'Full-width promotional banners with gradients' },
  COLLECTIONS:       { label: 'Collections',       emoji: '📦',  desc: 'Curated product collections' },
  TOP_PICKS:         { label: 'Top Picks',         emoji: '�',  desc: 'Best-selling / highest-rated' },
  FOR_YOU:           { label: 'For You',           emoji: '💝',  desc: 'Personalised recommendations' },
  GALLERY:           { label: 'Style Gallery',     emoji: '🎨',  desc: 'Visual collage / lookbook' },
}

export default function StorefrontBuilder() {
  const { data: apiSections, isLoading } = useSWR('/api/portal/cms/homepage-sections', fetcher)
  const [sections, setSections] = useState<Section[]>([])
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (apiSections && Array.isArray(apiSections)) {
      setSections(apiSections.sort((a: Section, b: Section) => a.sortOrder - b.sortOrder))
    }
  }, [apiSections])

  const toggleVisibility = (id: string) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, isVisible: !s.isVisible } : s
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = sections.map((s, i) => ({
        id: s.id,
        type: s.type,
        isVisible: s.isVisible,
        sortOrder: i,
        config: s.config,
      }))
      await fetch('/api/portal/cms/homepage-sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sections: payload }),
      })
      mutate('/api/portal/cms/homepage-sections')
      setHasChanges(false)
      toast.success('Homepage layout saved! Changes are live.')
    } catch {
      toast.error('Failed to save layout')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
              Storefront Builder
            </h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>
              Drag to reorder · Toggle visibility · Save to publish
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">Unsaved changes</span>
            )}
            <ClayButton variant="primary" size="sm" onClick={handleSave} loading={saving}>
              <Save size={16} /> Save Layout
            </ClayButton>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
          ))}</div>
        ) : (
          <motion.div variants={fadeUpVariants}>
            <Reorder.Group
              axis="y"
              values={sections}
              onReorder={(newOrder) => { setSections(newOrder); setHasChanges(true) }}
              className="space-y-2"
            >
              {sections.map((section) => {
                const meta = SECTION_META[section.type] ?? { label: section.type, emoji: '📄', desc: '' }
                return (
                  <Reorder.Item
                    key={section.id}
                    value={section}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-grab active:cursor-grabbing"
                    style={{
                      background: section.isVisible ? 'var(--portal-surface)' : 'var(--portal-elevated)',
                      border: '1px solid var(--portal-border)',
                      opacity: section.isVisible ? 1 : 0.5,
                    }}
                    whileDrag={{ scale: 1.02, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}
                  >
                    <GripVertical size={18} style={{ color: 'var(--portal-muted)' }} />
                    <span className="text-xl">{meta.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                        {meta.label}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                        {meta.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleVisibility(section.id)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      style={{ color: section.isVisible ? 'var(--portal-accent)' : 'var(--portal-muted)' }}
                    >
                      {section.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </Reorder.Item>
                )
              })}
            </Reorder.Group>
          </motion.div>
        )}

        <motion.div
          variants={fadeUpVariants}
          className="p-4 rounded-xl"
          style={{ background: 'var(--portal-surface)', border: '1px dashed var(--portal-border)' }}
        >
          <div className="flex items-start gap-3">
            <RefreshCw size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--portal-accent)' }} />
            <div className="text-sm" style={{ color: 'var(--portal-muted)' }}>
              <p className="font-medium mb-1" style={{ color: 'var(--portal-text)' }}>How it works</p>
              <p>Sections are rendered on the homepage in the order shown above. Hidden sections are skipped entirely.
              Data for each section (banners, products, stories, etc.) is managed in their respective CMS pages.</p>
              <p className="mt-2">
                Visit <a href="/" target="_blank" className="underline" style={{ color: 'var(--portal-accent)' }}>the homepage</a> to preview changes.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PortalShell>
  )
}
