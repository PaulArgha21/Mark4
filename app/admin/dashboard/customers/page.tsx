'use client'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  Search, ChevronLeft, ChevronRight, Users, ShoppingBag,
  TrendingUp, ArrowUpDown, UserX, Crown, Mail, Phone
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

interface Customer {
  id: string; name: string | null; email: string | null; phone: string | null
  isBlocked: boolean; orderCount: number; totalSpent: number; joinedAt: string
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'linear-gradient(135deg, #ec4899, #f43f5e)',
  'linear-gradient(135deg, #10b981, #14b8a6)',
  'linear-gradient(135deg, #3b82f6, #0ea5e9)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
  'linear-gradient(135deg, #8b5cf6, #a855f7)',
]

function getAvatarGradient(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<string>('newest')
  const url = `/api/portal/customers?page=${page}&limit=20&sort=${sort}${search ? `&search=${encodeURIComponent(search)}` : ''}`
  const { data, isLoading } = useSWR(url, fetcher)

  const customers: Customer[] = data?.items ?? []
  const pagination = data?.pagination

  const summaryStats = useMemo(() => {
    if (!customers.length) return null
    const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0)
    const totalOrders = customers.reduce((s, c) => s + c.orderCount, 0)
    const blocked = customers.filter(c => c.isBlocked).length
    return { totalSpent, totalOrders, blocked }
  }, [customers])

  const sortOptions = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'orders_desc', label: 'Most orders' },
    { value: 'spent_desc', label: 'Highest spent' },
  ]

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--portal-text)' }}>Customers</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
              {pagination ? `${pagination.total.toLocaleString()} registered customers` : 'Loading customer data...'}
            </p>
          </div>
        </motion.div>

        {/* Summary cards */}
        {pagination && (
          <motion.div variants={fadeUpVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: pagination.total.toLocaleString(), icon: Users, color: '#8b5cf6' },
              { label: 'Page Total Orders', value: summaryStats?.totalOrders?.toLocaleString() || '0', icon: ShoppingBag, color: '#3b82f6' },
              { label: 'Page Revenue', value: formatPrice(summaryStats?.totalSpent || 0), icon: TrendingUp, color: '#10b981' },
              { label: 'Blocked', value: String(summaryStats?.blocked || 0), icon: UserX, color: '#ef4444' },
            ].map(card => (
              <div key={card.label} className="relative p-4 rounded-2xl overflow-hidden group"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] blur-xl" style={{ background: card.color }} />
                <div className="relative flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${card.color}12`, border: `1px solid ${card.color}20` }}>
                    <card.icon size={16} style={{ color: card.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{card.label}</p>
                    <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--portal-text)' }}>{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Search + Sort row */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <input placeholder="Search by name, email, or phone..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
          </div>
          <div className="relative">
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}
              className="pl-9 pr-8 py-3 rounded-2xl text-xs font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </motion.div>

        {/* Customers table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['Customer', 'Contact', 'Orders', 'Total Spent', 'Status', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded-full animate-pulse" style={{ width: `${40 + Math.random() * 40}%`, background: 'var(--portal-elevated)' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center">
                      <Users size={40} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--portal-muted)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--portal-muted)' }}>No customers found</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>Try a different search term</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((c, i) => (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--portal-border)' : undefined }}
                      className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
                            style={{ background: getAvatarGradient(c.id) }}>
                            {(c.name || c.email || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--portal-text)' }}>{c.name || 'Unnamed'}</p>
                              {c.totalSpent > 10000 && (
                                <Crown size={12} className="flex-shrink-0 text-amber-400" />
                              )}
                            </div>
                            <p className="text-[10px] truncate" style={{ color: 'var(--portal-muted)' }}>ID: {c.id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {c.email && (
                            <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--portal-muted)' }}>
                              <Mail size={10} /> {c.email}
                            </p>
                          )}
                          {c.phone && (
                            <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--portal-muted)' }}>
                              <Phone size={10} /> {c.phone}
                            </p>
                          )}
                          {!c.email && !c.phone && <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--portal-text)' }}>{c.orderCount}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--portal-text)' }}>{formatPrice(c.totalSpent)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {c.isBlocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold bg-rose-500/10 text-rose-400">
                            <UserX size={10} /> Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular-nums" style={{ color: 'var(--portal-muted)' }}>
                        {new Date(c.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <motion.div variants={fadeUpVariants} className="flex items-center justify-between px-1">
            <p className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-xl disabled:opacity-20 transition-colors"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
                <ChevronLeft size={16} />
              </motion.button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, k) => {
                let pg = k + 1
                if (pagination.totalPages > 5) {
                  const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4))
                  pg = start + k
                }
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className="w-8 h-8 rounded-xl text-xs font-semibold transition-colors"
                    style={{
                      background: page === pg ? 'var(--portal-accent)' : 'transparent',
                      color: page === pg ? '#fff' : 'var(--portal-muted)',
                    }}>{pg}</button>
                )
              })}
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPage(p => p + 1)} disabled={!pagination.hasMore}
                className="p-2 rounded-xl disabled:opacity-20 transition-colors"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
                <ChevronRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}
