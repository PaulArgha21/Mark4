'use client'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import Link from 'next/link'
import {
  TrendingUp, ShoppingBag, Users, AlertTriangle, Zap, CreditCard,
  ArrowUpRight, ArrowDownRight, Package, Eye, FileText, BarChart3,
  Clock, CheckCircle, Truck, XCircle, ArrowRight, Activity
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

/* ─── Animated Number Counter ─── */
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, v => {
    if (v >= 100000) return `${(v / 100000).toFixed(1)}L`
    if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`
    return Math.round(v).toLocaleString()
  })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    const unsub = rounded.on('change', v => setDisplay(v))
    animate(motionVal, value, { duration: 1.2, ease: [0.22, 1, 0.36, 1] })
    return unsub
  }, [value, motionVal, rounded])

  return <span>{prefix}{display}{suffix}</span>
}

/* ─── Mini Sparkline SVG ─── */
function Sparkline({ trend, color }: { trend: number; color: string }) {
  const isUp = trend >= 0
  const points = isUp
    ? '0,20 8,18 16,14 24,16 32,10 40,12 48,6 56,4 64,2'
    : '0,4 8,6 16,10 24,8 32,14 40,12 48,16 56,18 64,20'
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" className="opacity-40">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Premium Stat Card ─── */
interface StatCardProps {
  label: string; value: string | number; numValue?: number; icon: React.ElementType
  trend?: { value: number; isUp: boolean }; color: string; gradient: string
}

function StatCard({ label, value, numValue, icon: Icon, trend, color, gradient }: StatCardProps) {
  return (
    <motion.div variants={fadeUpVariants}
      className="relative p-5 rounded-2xl overflow-hidden group cursor-default"
      style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={springs.gentle}>
      {/* Gradient glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500 blur-2xl"
        style={{ background: gradient }} />
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{label}</p>
          <p className="font-display text-[28px] leading-none font-bold" style={{ color: 'var(--portal-text)' }}>
            {numValue !== undefined ? <AnimatedNumber value={numValue} prefix={typeof value === 'string' && value.startsWith('₹') ? '₹' : ''} suffix={typeof value === 'string' && value.endsWith('%') ? '%' : ''} /> : value}
          </p>
          <div className="flex items-center gap-2">
            {trend && (
              <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${trend.isUp ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
                  {trend.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                </span>
                {trend.value}%
              </motion.div>
            )}
            {trend && <Sparkline trend={trend.isUp ? 1 : -1} color={color} />}
          </div>
        </div>
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-sm"
          style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, border: `1px solid ${color}20` }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    PENDING:    { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock },
    CONFIRMED:  { bg: 'bg-violet-500/10', text: 'text-violet-400', icon: CheckCircle },
    PROCESSING: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Package },
    SHIPPED:    { bg: 'bg-sky-500/10', text: 'text-sky-400', icon: Truck },
    DELIVERED:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
    CANCELLED:  { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: XCircle },
  }
  const c = config[status] || config.PENDING
  const StatusIcon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold ${c.bg} ${c.text}`}>
      <StatusIcon size={10} /> {status}
    </span>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useSWR('/api/portal/analytics/summary', fetcher)
  const { data: auditData } = useSWR('/api/portal/audit?limit=5', fetcher)
  const recentActivity = auditData?.items ?? []

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    return 'Good Evening'
  })()

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
        {/* Header with greeting */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium" style={{ color: 'var(--portal-accent)' }}>
              {greeting}
            </motion.p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1" style={{ color: 'var(--portal-text)' }}>
              Dashboard
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
              Real-time overview of your store performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/finance" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
              <BarChart3 size={14} /> Analytics
            </Link>
            <Link href="/admin/dashboard/orders" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'var(--portal-accent)', color: '#fff' }}>
              <Package size={14} /> Process Orders
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid — Premium */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Revenue MTD" value={formatPrice(data?.revenueMTD || 0)}
              numValue={data?.revenueMTD || 0} icon={TrendingUp}
              trend={data?.trends?.revenue !== undefined ? { value: Math.abs(data.trends.revenue), isUp: data.trends.revenue >= 0 } : undefined}
              color="#10b981" gradient="linear-gradient(135deg, #10b981, #059669)" />
            <StatCard label="Orders Today" value={data?.ordersToday || 0}
              numValue={data?.ordersToday || 0} icon={ShoppingBag}
              trend={data?.trends?.orders !== undefined ? { value: Math.abs(data.trends.orders), isUp: data.trends.orders >= 0 } : undefined}
              color="#3b82f6" gradient="linear-gradient(135deg, #3b82f6, #2563eb)" />
            <StatCard label="Pending Orders" value={data?.pendingOrders || 0}
              numValue={data?.pendingOrders || 0} icon={Clock}
              color="#f59e0b" gradient="linear-gradient(135deg, #f59e0b, #d97706)" />
            <StatCard label="Total Customers" value={(data?.totalUsers || 0).toLocaleString()}
              numValue={data?.totalUsers || 0} icon={Users}
              trend={data?.trends?.users !== undefined ? { value: Math.abs(data.trends.users), isUp: data.trends.users >= 0 } : undefined}
              color="#8b5cf6" gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)" />
            <StatCard label="Low Stock" value={data?.lowStockCount || 0}
              numValue={data?.lowStockCount || 0} icon={AlertTriangle}
              color="#ef4444" gradient="linear-gradient(135deg, #ef4444, #dc2626)" />
            <StatCard label="Flash Sales" value={data?.activeFlashSales || 0}
              numValue={data?.activeFlashSales || 0} icon={Zap}
              color="#eab308" gradient="linear-gradient(135deg, #eab308, #ca8a04)" />
            <StatCard label="Conversion" value={`${data?.conversionRate || 0}%`}
              numValue={data?.conversionRate || 0} icon={Eye}
              color="#06b6d4" gradient="linear-gradient(135deg, #06b6d4, #0891b2)" />
            <StatCard label="Avg Order Value" value={formatPrice(data?.avgOrderValue || 0)}
              numValue={data?.avgOrderValue || 0} icon={CreditCard}
              color="#ec4899" gradient="linear-gradient(135deg, #ec4899, #db2777)" />
          </div>
        )}

        {/* Quick Actions — Card Grid */}
        <motion.div variants={fadeUpVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Add Product', href: '/admin/dashboard/products', icon: Package, color: '#10b981' },
              { label: 'Process Orders', href: '/admin/dashboard/orders', icon: Truck, color: '#3b82f6' },
              { label: 'CMS Builder', href: '/admin/cms/builder', icon: FileText, color: '#8b5cf6' },
              { label: 'Create Coupon', href: '/admin/offers/coupons', icon: Zap, color: '#f59e0b' },
            ].map(action => (
              <motion.div key={action.label} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link href={action.href}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl text-center transition-all group"
                  style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: `${action.color}12`, border: `1px solid ${action.color}20` }}>
                    <action.icon size={20} style={{ color: action.color }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--portal-text)' }}>{action.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Two-column layout: Recent Orders + Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Orders — 2/3 width */}
          <motion.div variants={fadeUpVariants} className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Recent Orders</h2>
              <Link href="/admin/dashboard/orders" className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--portal-accent)' }}>
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      {['Order', 'Customer', 'Status', 'Amount', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--portal-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="px-4 py-3.5">
                              <div className="h-3 rounded-full animate-pulse" style={{ width: `${40 + Math.random() * 40}%`, background: 'var(--portal-elevated)' }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : !data?.recentOrders?.length ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center">
                          <ShoppingBag size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--portal-muted)' }} />
                          <p className="text-sm font-medium" style={{ color: 'var(--portal-muted)' }}>No orders yet</p>
                        </td>
                      </tr>
                    ) : (
                      data.recentOrders.map((row: { id: string; orderNumber: string; customer: string; status: string; amount: number; createdAt: string }, i: number) => (
                        <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                          style={{ borderBottom: i < data.recentOrders.length - 1 ? '1px solid var(--portal-border)' : undefined }}
                          className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-4 py-3.5">
                            <span className="text-sm font-semibold font-mono" style={{ color: 'var(--portal-accent)' }}>{row.orderNumber}</span>
                          </td>
                          <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--portal-text)' }}>{row.customer}</td>
                          <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                          <td className="px-4 py-3.5 text-sm font-semibold tabular-nums" style={{ color: 'var(--portal-text)' }}>{formatPrice(row.amount)}</td>
                          <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--portal-muted)' }}>
                            {new Date(row.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Activity Feed — 1/3 width */}
          <motion.div variants={fadeUpVariants}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Activity</h2>
              <Link href="/admin/dashboard/audit" className="text-xs font-medium" style={{ color: 'var(--portal-accent)' }}>View all</Link>
            </div>
            <div className="rounded-2xl p-4 space-y-1"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              {recentActivity.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity size={24} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--portal-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>No recent activity</p>
                </div>
              ) : (
                recentActivity.map((log: { id: string; action: string; employeeName: string; createdAt: string }, i: number) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 py-3 relative"
                    style={{ borderBottom: i < recentActivity.length - 1 ? '1px solid var(--portal-border)' : undefined }}>
                    <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--portal-accent)' }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono font-medium truncate" style={{ color: 'var(--portal-text)' }}>{log.action}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--portal-muted)' }}>
                        {log.employeeName} &middot; {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </PortalShell>
  )
}
