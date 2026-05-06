'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Zap, Ticket, Package, BarChart3, Clock } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

interface Dashboard {
  summary: { activeCoupons: number; totalCoupons: number; totalRedemptions: number; todayRedemptions: number; activeFlashSales: number; upcomingFlashSales: number; flashSaleTotalSold: number; activeBundles: number; totalBundles: number }
  topCoupons: { id: string; code: string; discountType: string; discountValue: number; usedCount: number; usageRate: number | null }[]
  liveFlashSales: { id: string; name: string; endsAt: string; productCount: number; totalSold: number; totalStock: number; revenue: number }[]
}

export default function OffersPortal() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portal/offers/dashboard').then(r => r.json())
      .then(d => { if (d.data) setData(d.data) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const s = data?.summary

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants}>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Offers &amp; Promotions</h1>
          <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Manage discounts, coupons, and flash sales</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="h-5 w-5 rounded bg-white/10 mb-2" /><div className="h-6 w-12 rounded bg-white/10" />
            </div>
          )) : [
            { label: 'Active Coupons', value: s?.activeCoupons ?? 0, icon: Ticket, color: '#7950f2' },
            { label: 'Live Flash Sales', value: s?.activeFlashSales ?? 0, icon: Zap, color: '#f08c00' },
            { label: 'Active Bundles', value: s?.activeBundles ?? 0, icon: Package, color: '#339af0' },
            { label: 'Redemptions Today', value: s?.todayRedemptions ?? 0, icon: BarChart3, color: '#2f9e44' },
            { label: 'Total Redemptions', value: s?.totalRedemptions ?? 0, icon: BarChart3, color: '#20c997' },
          ].map(st => (
            <div key={st.label} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <st.icon size={20} style={{ color: st.color }} />
              <p className="font-display text-2xl font-bold mt-2" style={{ color: 'var(--portal-text)' }}>{st.value}</p>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{st.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Links */}
        <motion.div variants={fadeUpVariants} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Coupons', desc: 'Create and manage discount codes', href: '/admin/offers/coupons', icon: Ticket, color: '#7950f2' },
            { title: 'Flash Sales', desc: 'Time-limited sales events', href: '/admin/offers/flash-sales', icon: Zap, color: '#f08c00' },
            { title: 'Bundles', desc: 'Product bundle deals', href: '/admin/offers/bundles', icon: Package, color: '#339af0' },
          ].map(card => (
            <Link key={card.title} href={card.href}>
              <motion.div
                className="p-4 rounded-2xl h-full flex items-start gap-3"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
                whileHover={{ y: -3, borderColor: 'var(--portal-accent)' }}
                transition={springs.gentle}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${card.color}15` }}>
                  <card.icon size={18} style={{ color: card.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>{card.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--portal-muted)' }}>{card.desc}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* Top Coupons + Live Flash Sales */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Top Coupons */}
          <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>Top Performing Coupons</h3>
              <Link href="/admin/offers/coupons" className="text-xs" style={{ color: 'var(--portal-accent)' }}>Manage →</Link>
            </div>
            {!data?.topCoupons?.length ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No coupon usage data yet</p>
            ) : (
              <div className="space-y-2.5">
                {data.topCoupons.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono" style={{ background: 'var(--portal-accent)', color: '#fff' }}>{c.code}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: 'var(--portal-text)' }}>{c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : formatPrice(c.discountValue)}</span>
                        <span style={{ color: 'var(--portal-muted)' }}>{c.usedCount} used</span>
                      </div>
                      {c.usageRate !== null && (
                        <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--portal-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(c.usageRate, 100)}%`, background: c.usageRate >= 80 ? '#e03131' : c.usageRate >= 50 ? '#f08c00' : 'var(--portal-accent)' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Live Flash Sales */}
          <motion.div variants={fadeUpVariants} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>Live Flash Sales</h3>
              <Link href="/admin/offers/flash-sales" className="text-xs" style={{ color: 'var(--portal-accent)' }}>Manage →</Link>
            </div>
            {!data?.liveFlashSales?.length ? (
              <p className="py-6 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No active flash sales</p>
            ) : (
              <div className="space-y-3">
                {data.liveFlashSales.map(fs => {
                  const sellThrough = fs.totalStock > 0 ? Math.round((fs.totalSold / fs.totalStock) * 100) : 0
                  return (
                    <div key={fs.id} className="p-3 rounded-xl" style={{ background: 'var(--portal-bg)' }}>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{fs.name}</h4>
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: '#f08c00' }}>
                          <Clock size={10} /> Ends {new Date(fs.endsAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div><p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Products</p><p className="text-xs font-bold" style={{ color: 'var(--portal-text)' }}>{fs.productCount}</p></div>
                        <div><p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Revenue</p><p className="text-xs font-bold" style={{ color: 'var(--portal-text)' }}>{formatPrice(fs.revenue)}</p></div>
                        <div><p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Sell-through</p><p className="text-xs font-bold" style={{ color: sellThrough >= 70 ? '#2f9e44' : '#f08c00' }}>{sellThrough}%</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>

      </motion.div>
    </PortalShell>
  )
}
