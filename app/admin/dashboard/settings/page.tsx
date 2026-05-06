'use client'
import { useState, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Globe, Mail, Share2, Search, Megaphone, Save, Loader2,
  Palette, Eye, ExternalLink, Camera, Hash, MessageCircle, Play,
  Phone, AtSign, FileText, CheckCircle, AlertCircle
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)
const API = '/api/portal/settings'

const TABS = [
  { key: 'general', label: 'General', icon: Globe },
  { key: 'seo', label: 'SEO & Meta', icon: Search },
  { key: 'announce', label: 'Announcement', icon: Megaphone },
  { key: 'social', label: 'Social', icon: Share2 },
  { key: 'footer', label: 'Footer', icon: FileText },
] as const

type TabKey = typeof TABS[number]['key']

export default function SettingsPortal() {
  const { data, isLoading } = useSWR(API, fetcher)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('general')

  useEffect(() => {
    if (data) {
      setForm({
        siteName: data.siteName ?? '',
        tagline: data.tagline ?? '',
        contactEmail: data.contactEmail ?? '',
        contactPhone: data.contactPhone ?? '',
        logoUrl: data.logoUrl ?? '',
        faviconUrl: data.faviconUrl ?? '',
        primaryColor: data.primaryColor ?? '#d6336c',
        metaTitle: data.metaTitle ?? '',
        metaDescription: data.metaDescription ?? '',
        announcementText: data.announcementText ?? '',
        announcementLink: data.announcementLink ?? '',
        socialFacebook: data.socialFacebook ?? '',
        socialInstagram: data.socialInstagram ?? '',
        socialTwitter: data.socialTwitter ?? '',
        socialYoutube: data.socialYoutube ?? '',
        footerText: data.footerText ?? '',
      })
    }
  }, [data])

  const update = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(API, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed'); }
      mutate(API)
      setDirty(false)
      toast.success('Settings saved successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally { setSaving(false) }
  }

  const Field = ({ label, field, placeholder, type = 'input', icon: Icon }: { label: string; field: string; placeholder: string; type?: 'input' | 'textarea'; icon?: React.ElementType }) => (
    <div className="group">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--portal-muted)' }}>
        {Icon && <Icon size={11} />} {label}
      </label>
      {type === 'textarea' ? (
        <textarea value={form[field] ?? ''} onChange={e => update(field, e.target.value)}
          placeholder={placeholder} rows={3}
          className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50 resize-none transition-shadow"
          style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
      ) : (
        <input value={form[field] ?? ''} onChange={e => update(field, e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50 transition-shadow"
          style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
      )}
    </div>
  )

  if (isLoading) {
    return (
      <PortalShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--portal-accent)' }} />
        </div>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--portal-text)' }}>Settings</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>Global store configuration & branding</p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {dirty && (
                <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold bg-amber-500/10 text-amber-400">
                  <AlertCircle size={10} /> Unsaved changes
                </motion.span>
              )}
            </AnimatePresence>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave} disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--portal-accent)', color: '#fff' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Changes
            </motion.button>
          </div>
        </motion.div>

        {/* Tab bar */}
        <motion.div variants={fadeUpVariants} className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            const TabIcon = tab.icon
            return (
              <motion.button key={tab.key} whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? 'var(--portal-accent)' : 'var(--portal-surface)',
                  color: active ? '#fff' : 'var(--portal-muted)',
                  border: `1px solid ${active ? 'var(--portal-accent)' : 'var(--portal-border)'}`,
                }}>
                <TabIcon size={13} /> {tab.label}
              </motion.button>
            )
          })}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}>

            {activeTab === 'general' && (
              <div className="p-6 rounded-2xl space-y-5" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                    <Globe size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>General Settings</h2>
                    <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Store identity & contact details</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Site Name" field="siteName" placeholder="Store name" icon={Globe} />
                  <Field label="Tagline" field="tagline" placeholder="Curated fashion for the modern soul" />
                  <Field label="Support Email" field="contactEmail" placeholder="support@example.com" icon={AtSign} />
                  <Field label="Support Phone" field="contactPhone" placeholder="+91-XXX-XXX-XXXX" icon={Phone} />
                  <Field label="Logo URL" field="logoUrl" placeholder="https://..." icon={ExternalLink} />
                  <Field label="Favicon URL" field="faviconUrl" placeholder="https://..." icon={ExternalLink} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--portal-muted)' }}>
                    <Palette size={11} /> Brand Color
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <input type="color" value={form.primaryColor || '#d6336c'} onChange={e => update('primaryColor', e.target.value)}
                        className="w-12 h-12 rounded-2xl border-0 cursor-pointer" />
                    </div>
                    <input value={form.primaryColor || ''} onChange={e => update('primaryColor', e.target.value)}
                      className="w-32 px-4 py-3 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
                      style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
                    <div className="flex gap-1.5">
                      {['#d6336c', '#7950f2', '#1c7ed6', '#099268', '#e8590c'].map(c => (
                        <button key={c} onClick={() => update('primaryColor', c)}
                          className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                          style={{ background: c, outline: form.primaryColor === c ? `2px solid ${c}` : '2px solid transparent', outlineOffset: '2px' }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="p-6 rounded-2xl space-y-5" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#3b82f615', border: '1px solid #3b82f625' }}>
                    <Search size={16} style={{ color: '#3b82f6' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>SEO & Meta Tags</h2>
                    <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Search engine optimization settings</p>
                  </div>
                </div>
                <Field label="Meta Title" field="metaTitle" placeholder="My Store — Premium Fashion" icon={FileText} />
                <Field label="Meta Description" field="metaDescription" placeholder="Discover curated collections..." type="textarea" />

                {/* Live SEO Preview */}
                <div className="p-4 rounded-2xl space-y-2" style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Eye size={12} style={{ color: 'var(--portal-accent)' }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-accent)' }}>Live Google Preview</span>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: '#fff' }}>
                    <p className="text-[13px] font-medium" style={{ color: '#1a0dab' }}>{form.metaTitle || form.siteName || 'Site Title'} - Your Store</p>
                    <p className="text-[11px] mt-0.5" style={{ color: '#006621' }}>https://yourstore.com</p>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: '#545454' }}>{form.metaDescription || 'No meta description set. Add one to improve your search ranking.'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'announce' && (
              <div className="p-6 rounded-2xl space-y-5" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b15', border: '1px solid #f59e0b25' }}>
                    <Megaphone size={16} style={{ color: '#f59e0b' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>Announcement Bar</h2>
                    <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Top banner visible on all pages</p>
                  </div>
                </div>
                <Field label="Announcement Text" field="announcementText" placeholder="FREE SHIPPING on orders above ₹999" icon={Megaphone} />
                <Field label="Link URL (optional)" field="announcementLink" placeholder="/collections/sale" icon={ExternalLink} />

                {/* Preview */}
                {form.announcementText && (
                  <div className="rounded-2xl overflow-hidden">
                    <div className="py-2.5 px-4 text-center text-xs font-semibold" style={{ background: form.primaryColor || '#d6336c', color: '#fff' }}>
                      {form.announcementText}
                      {form.announcementLink && <span className="ml-1 underline underline-offset-2">Shop Now</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'social' && (
              <div className="p-6 rounded-2xl space-y-5" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#ec489915', border: '1px solid #ec489925' }}>
                    <Share2 size={16} style={{ color: '#ec4899' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>Social Media Links</h2>
                    <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Connect your social profiles</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Instagram" field="socialInstagram" placeholder="https://instagram.com/..." icon={Camera} />
                  <Field label="Facebook" field="socialFacebook" placeholder="https://facebook.com/..." icon={Hash} />
                  <Field label="Twitter / X" field="socialTwitter" placeholder="https://x.com/..." icon={MessageCircle} />
                  <Field label="YouTube" field="socialYoutube" placeholder="https://youtube.com/..." icon={Play} />
                </div>
              </div>
            )}

            {activeTab === 'footer' && (
              <div className="p-6 rounded-2xl space-y-5" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#6b728015', border: '1px solid #6b728025' }}>
                    <Settings size={16} style={{ color: '#6b7280' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>Footer Content</h2>
                    <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Copyright & legal text shown at bottom</p>
                  </div>
                </div>
                <Field label="Footer Text (HTML supported)" field="footerText" placeholder="© 2026 Aprdite. All rights reserved." type="textarea" icon={FileText} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Sticky save bar on mobile */}
        <AnimatePresence>
          {dirty && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 left-4 right-4 sm:hidden z-50">
              <div className="flex items-center justify-between p-3 rounded-2xl backdrop-blur-xl"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>Unsaved changes</span>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--portal-accent)', color: '#fff' }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </PortalShell>
  )
}
