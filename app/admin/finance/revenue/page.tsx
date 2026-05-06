'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, ShoppingCart, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

interface TimeSeriesPoint { label: string; revenue: number; orders: number; aov: number }
interface CategoryItem { name: string; revenue: number; orders: number }
interface PaymentMethodItem { method: string; revenue: number; count: number }
interface TopProduct { productId: string; name: string; slug: string; revenue: number; unitsSold: number }
interface Summary {
  revenue: number; netRevenue: number; refunds: number; refundCount: number
  orders: number; transactions: number; aov: number
  revenueGrowth: number | null; orderGrowth: number | null
}

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [granularity, setGranularity] = useState('daily')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [methods, setMethods] = useState<PaymentMethodItem[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch(`/api/portal/finance/revenue?period=${period}&granularity=${granularity}&compare=previous_period`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setSummary(d.data.summary)
          setTimeSeries(d.data.timeSeries ?? [])
          setCategories(d.data.categoryBreakdown ?? [])
          setMethods(d.data.paymentMethodBreakdown ?? [])
          setTopProducts(d.data.topProducts ?? [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period, granularity])

  useEffect(() => { fetchData() }, [fetchData])

  const maxRev = Math.max(...timeSeries.map(t => t.revenue), 1)
  const totalMethodRevenue = methods.reduce((s, m) => s + m.revenue, 0) || 1

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/finance" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Revenue Analytics</h1>
              <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Detailed breakdown of revenue performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {['7d', '30d', '90d', '12m', 'ytd'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: period === p ? 'var(--portal-accent)' : 'transparent', color: period === p ? '#fff' : 'var(--portal-muted)', border: `1px solid ${period === p ? 'var(--portal-accent)' : 'var(--portal-border)'}` }}
              >{p.toUpperCase()}</button>
            ))}
          </div>
        </motion.div>

        {/* KPI Cards */}
        {summary && (
          <motion.div variants={fadeUpVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Revenue', value: formatPrice(summary.revenue), growth: summary.revenueGrowth, icon: TrendingUp, color: '#2f9e44' },
              { label: 'Net Revenue', value: formatPrice(summary.netRevenue), icon: TrendingUp, color: '#339af0' },
              { label: 'Orders', value: summary.orders.toLocaleString(), growth: summary.orderGrowth, icon: ShoppingCart, color: '#7950f2' },
              { label: 'AOV', value: formatPrice(summary.aov), icon: CreditCard, color: '#f08c00' },
              { label: 'Refunds', value: formatPrice(summary.refunds), sub: `${summary.refundCount} processed`, icon: TrendingUp, color: '#e03131' },
            ].map(kpi => (
              <div key={kpi.label} className="p-4 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <kpi.icon size={13} style={{ color: kpi.color }} />
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--portal-muted)' }}>{kpi.label}</span>
                </div>
                <p className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>{kpi.value}</p>
                {'growth' in kpi && kpi.growth != null && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {kpi.growth >= 0 ? <ArrowUpRight size={10} className="text-green-400" /> : <ArrowDownRight size={10} className="text-red-400" />}
                    <span className={`text-[10px] ${kpi.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>{Math.abs(kpi.growth).toFixed(1)}%</span>
                  </div>
                )}
                {'sub' in kpi && kpi.sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--portal-muted)' }}>{kpi.sub}</p>}
              </div>
            ))}
          </motion.div>
        )}

        {/* Granularity selector */}
        <motion.div variants={fadeUpVariants} className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>Granularity:</span>
          {['daily', 'weekly', 'monthly'].map(g => (
            <button key={g} onClick={() => setGranularity(g)}
              className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
              style={{ background: granularity === g ? 'var(--portal-accent)' : 'transparent', color: granularity === g ? '#fff' : 'var(--portal-muted)' }}
            >{g}</button>
          ))}
        </motion.div>

        {/* Revenue Chart */}
        <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--portal-text)' }}>Revenue Over Time</h3>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full" />
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-end gap-[2px] h-48">
                {timeSeries.map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 p-2 rounded-lg text-[10px] whitespace-nowrap"
                      style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
                      <div className="font-semibold">{t.label}</div>
                      <div>Revenue: {formatPrice(t.revenue)}</div>
                      <div>Orders: {t.orders}</div>
                      <div>AOV: {formatPrice(t.aov)}</div>
                    </div>
                    <div
                      className="w-full rounded-t transition-all hover:opacity-80"
                      style={{ height: `${Math.max(2, (t.revenue / maxRev) * 100)}%`, background: 'var(--portal-accent)' }}
                    />
                  </div>
                ))}
              </div>
              {timeSeries.length <= 12 && (
                <div className="flex gap-[2px]">
                  {timeSeries.map((t, i) => (
                    <div key={i} className="flex-1 text-center text-[8px]" style={{ color: 'var(--portal-muted)' }}>{t.label}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Bottom Grid: Category + Payment + Top Products */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Category breakdown */}
          <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--portal-text)' }}>By Category</h3>
            <div className="space-y-3">
              {categories.slice(0, 8).map((c, i) => (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--portal-text)' }}>{c.name}</span>
                    <span style={{ color: 'var(--portal-muted)' }}>{formatPrice(c.revenue)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--portal-border)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: 'var(--portal-accent)' }}
                      initial={{ width: 0 }} animate={{ width: `${(c.revenue / (categories[0]?.revenue || 1)) * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Payment method breakdown */}
          <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--portal-text)' }}>Payment Methods</h3>
            <div className="space-y-3">
              {methods.map((m, i) => {
                const pct = ((m.revenue / totalMethodRevenue) * 100).toFixed(1)
                const colors = ['#339af0', '#7950f2', '#2f9e44', '#f08c00', '#e03131', '#20c997']
                return (
                  <div key={m.method} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--portal-text)' }}>{m.method || 'Unknown'}</span>
                        <span style={{ color: 'var(--portal-muted)' }}>{pct}%</span>
                      </div>
                      <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--portal-border)' }}>
                        <motion.div className="h-full rounded-full" style={{ background: colors[i % colors.length] }}
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--portal-text)' }}>{formatPrice(m.revenue)}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Top products */}
          <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--portal-text)' }}>Top Products</h3>
            <div className="space-y-2.5">
              {topProducts.slice(0, 8).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold w-4 text-right" style={{ color: 'var(--portal-muted)' }}>#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--portal-text)' }}>{p.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{p.unitsSold} units</p>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--portal-accent)' }}>{formatPrice(p.revenue)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </PortalShell>
  )
}
