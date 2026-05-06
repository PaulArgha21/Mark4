'use client'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, LayoutDashboard, Image, FolderKanban, FileText, Star, Camera, Palette, Megaphone, Activity } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const cmsCards = [
  { title: 'Storefront Builder', desc: 'Reorder, show/hide homepage sections', href: '/admin/cms/builder', icon: LayoutDashboard, color: '#7c3aed' },
  { title: 'Hero Banners', desc: 'Manage hero carousel banners', href: '/admin/cms/banners', icon: Image, color: '#2563eb' },
  { title: 'Collections', desc: 'Create and manage product collections', href: '/admin/cms/collections', icon: FolderKanban, color: '#0891b2' },
  { title: 'Blog & Editorial', desc: 'Publish articles and style guides', href: '/admin/cms/blog', icon: FileText, color: '#059669' },
  { title: 'Review Moderation', desc: 'Moderate and respond to product reviews', href: '/admin/cms/reviews', icon: Star, color: '#d97706', countKey: 'reviews' as const },
  { title: 'Story Banners', desc: 'Manage story bubbles on homepage', href: '/admin/cms/stories', icon: Camera, color: '#e11d48' },
  { title: 'Style Gallery', desc: 'Curate the gallery collage section', href: '/admin/cms/gallery', icon: Palette, color: '#6366f1' },
  { title: 'Promotions & Offers', desc: 'Promo cards, bundles, seasonal offers', href: '/admin/offers', icon: Megaphone, color: '#ea580c' },
]

export default function CmsPortal() {
  const { data: reviewData } = useSWR('/api/portal/cms/reviews?status=pending&limit=1', fetcher)
  const { data: bannerData } = useSWR('/api/portal/cms/banners?type=hero', fetcher)
  const { data: blogData } = useSWR('/api/portal/cms/blog?limit=1', fetcher)
  const { data: collectionData } = useSWR('/api/portal/cms/collections', fetcher)
  const { data: storyData } = useSWR('/api/portal/cms/stories', fetcher)
  const { data: galleryData } = useSWR('/api/portal/cms/gallery', fetcher)
  const { data: auditData } = useSWR('/api/portal/audit?search=cms&limit=5', fetcher)

  const pendingReviews = reviewData?.pendingCount ?? 0
  const recentActivity = auditData?.items ?? []

  const stats: Record<string, number | null> = {
    banners: Array.isArray(bannerData) ? bannerData.length : null,
    collections: Array.isArray(collectionData) ? collectionData.length : null,
    blog: blogData?.pagination?.total ?? null,
    stories: Array.isArray(storyData) ? storyData.length : null,
    gallery: Array.isArray(galleryData) ? galleryData.length : null,
    reviews: pendingReviews,
  }

  const getCardStat = (title: string): string | null => {
    if (title === 'Hero Banners' && stats.banners !== null) return `${stats.banners} active`
    if (title === 'Collections' && stats.collections !== null) return `${stats.collections} collections`
    if (title === 'Blog & Editorial' && stats.blog !== null) return `${stats.blog} posts`
    if (title === 'Story Banners' && stats.stories !== null) return `${stats.stories} stories`
    if (title === 'Style Gallery' && stats.gallery !== null) return `${stats.gallery} items`
    return null
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
        <motion.div variants={fadeUpVariants}>
          <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--portal-text)' }}>Content Management</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
            Manage storefront content, editorial, and visual assets
          </p>
        </motion.div>

        {/* Quick stats strip */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending Reviews', value: pendingReviews, color: pendingReviews > 0 ? '#f59e0b' : '#22c55e' },
            { label: 'Blog Posts', value: stats.blog ?? '—', color: '#2563eb' },
            { label: 'Collections', value: stats.collections ?? '—', color: '#0891b2' },
            { label: 'Hero Banners', value: stats.banners ?? '—', color: '#7c3aed' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl text-center"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--portal-muted)' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* CMS Module Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cmsCards.map(card => {
            const Icon = card.icon
            const stat = getCardStat(card.title)
            return (
              <motion.div key={card.title} variants={fadeUpVariants}>
                <Link href={card.href}>
                  <motion.div
                    className="p-5 rounded-2xl h-full cursor-pointer group relative overflow-hidden"
                    style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
                    whileHover={{ y: -3, borderColor: card.color }}
                    transition={springs.gentle}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity"
                      style={{ background: `radial-gradient(circle at top right, ${card.color}, transparent)` }} />
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: `${card.color}15` }}>
                      <Icon size={18} style={{ color: card.color }} />
                    </div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>{card.title}</h3>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--portal-muted)' }}>{card.desc}</p>
                    {('countKey' in card && card.countKey === 'reviews' && pendingReviews > 0) ? (
                      <p className="text-xs mt-3 font-semibold" style={{ color: '#f59e0b' }}>
                        {pendingReviews} pending approval
                      </p>
                    ) : stat ? (
                      <p className="text-xs mt-3 font-medium" style={{ color: 'var(--portal-muted)' }}>{stat}</p>
                    ) : null}
                    <div className="flex items-center gap-1 mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: card.color }}>
                      Manage <ArrowRight size={12} />
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Recent CMS Activity */}
        {recentActivity.length > 0 && (
          <motion.div variants={fadeUpVariants} className="rounded-2xl p-5"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} style={{ color: 'var(--portal-accent)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>Recent CMS Activity</h2>
            </div>
            <div className="space-y-2">
              {recentActivity.map((log: { id: string; action: string; employeeName: string; createdAt: string }) => (
                <div key={log.id} className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--portal-accent)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--portal-text)' }}>{log.action}</span>
                    <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>by {log.employeeName}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>
                    {new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}
