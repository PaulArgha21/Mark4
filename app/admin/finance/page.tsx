'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { TrendingUp, ArrowDownLeft, Download, IndianRupee, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

interface RevenueSummary {
  revenue: number; netRevenue: number; refunds: number; refundCount: number
  orders: number; aov: number; revenueGrowth: number | null; orderGrowth: number | null
}
interface TimeSeriesPoint { label: string; revenue: number; orders: number; aov: number }
interface CategoryItem { name: string; revenue: number; orders: number }

export default function FinancePortal() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/finance/revenue?period=30d&granularity=daily')
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setSummary(d.data.summary)
          setTimeSeries(d.data.timeSeries ?? [])
          setCategories(d.data.categoryBreakdown?.slice(0, 5) ?? [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = summary ? [
    { label: 'Revenue (30d)', value: formatPrice(summary.revenue), icon: TrendingUp, color: '#2f9e44', growth: summary.revenueGrowth },
    { label: 'Refunds', value: formatPrice(summary.refunds), icon: ArrowDownLeft, color: '#e03131', sub: `${summary.refundCount} refunds` },
    { label: 'Net Revenue', value: formatPrice(summary.netRevenue), icon: IndianRupee, color: '#339af0' },
    { label: 'Avg Order Value', value: formatPrice(summary.aov), icon: BarChart3, color: '#f08c00', growth: summary.orderGrowth },
  ] : []

  // Mini sparkline bar chart from time series
  const maxRevenue = Math.max(...timeSeries.map(t => t.revenue), 1)

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants}>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Finance</h1>
          <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Revenue, refunds, and financial reports</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="h-3 w-20 rounded bg-white/10 mb-3" />
              <div className="h-6 w-28 rounded bg-white/10" />
            </div>
          )) : stats.map(s => (
            <div
              key={s.label}
              className="p-5 rounded-2xl"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={16} style={{ color: s.color }} />
                <p className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>{s.label}</p>
              </div>
              <p className="font-display text-xl font-bold" style={{ color: 'var(--portal-text)' }}>{s.value}</p>
              {'growth' in s && s.growth !== null && s.growth !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {s.growth >= 0
                    ? <ArrowUpRight size={12} className="text-green-400" />
                    : <ArrowDownRight size={12} className="text-red-400" />
                  }
                  <span className={`text-xs font-medium ${s.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(s.growth).toFixed(1)}% vs prev period
                  </span>
                </div>
              )}
              {'sub' in s && s.sub && (
                <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>{s.sub}</p>
              )}
            </div>
          ))}
        </motion.div>

        {/* Revenue Sparkline */}
        {timeSeries.length > 0 && (
          <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>Revenue Trend (30 days)</h3>
              <Link href="/admin/finance/revenue" className="text-xs font-medium" style={{ color: 'var(--portal-accent)' }}>
                View Full Analytics →
              </Link>
            </div>
            <div className="flex items-end gap-[2px] h-20">
              {timeSeries.slice(-30).map((t, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all hover:opacity-80 group relative"
                  style={{
                    height: `${Math.max(4, (t.revenue / maxRevenue) * 100)}%`,
                    background: `var(--portal-accent)`,
                    opacity: 0.4 + (t.revenue / maxRevenue) * 0.6,
                  }}
                  title={`${t.label}: ${formatPrice(t.revenue)}`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Category Breakdown + Quick Links */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Top categories */}
          {categories.length > 0 && (
            <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--portal-text)' }}>Revenue by Category</h3>
              <div className="space-y-3">
                {categories.map((c, i) => {
                  const maxCatRev = categories[0]?.revenue || 1
                  return (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--portal-text)' }}>{c.name}</span>
                        <span style={{ color: 'var(--portal-muted)' }}>{formatPrice(c.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--portal-border)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: 'var(--portal-accent)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(c.revenue / maxCatRev) * 100}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Quick Links */}
          <motion.div variants={fadeUpVariants} className="grid gap-3">
            {[
              { title: 'Revenue Analytics', desc: 'Detailed revenue breakdown by date, category', href: '/admin/finance/revenue', icon: TrendingUp, color: '#2f9e44' },
              { title: 'Refund Management', desc: 'Process and track customer refunds', href: '/admin/finance/refunds', icon: ArrowDownLeft, color: '#e03131' },
              { title: 'Export Reports', desc: 'Download CSV/Excel reports for accounting', href: '/admin/finance/export', icon: Download, color: '#339af0' },
            ].map(card => (
              <Link key={card.title} href={card.href}>
                <motion.div
                  className="p-4 rounded-2xl flex items-center gap-4"
                  style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
                  whileHover={{ x: 4, borderColor: 'var(--portal-accent)' }}
                  transition={springs.gentle}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${card.color}15` }}>
                    <card.icon size={18} style={{ color: card.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>{card.title}</h3>
                    <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{card.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </PortalShell>
  )
}
