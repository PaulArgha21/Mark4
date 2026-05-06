'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  Search, ChevronLeft, ChevronRight, Shield, ShoppingBag, FileText,
  Settings, Zap, Package, DollarSign, Clock, Activity, User2
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

function getActionMeta(action: string): { color: string; bg: string; icon: React.ElementType } {
  if (action.startsWith('product')) return { color: '#10b981', bg: 'bg-emerald-500/10', icon: Package }
  if (action.startsWith('order')) return { color: '#3b82f6', bg: 'bg-blue-500/10', icon: ShoppingBag }
  if (action.startsWith('cms') || action.includes('banner') || action.includes('gallery') || action.includes('story') || action.includes('blog') || action.includes('collection') || action.includes('review')) return { color: '#8b5cf6', bg: 'bg-violet-500/10', icon: FileText }
  if (action.includes('flash_sale') || action.includes('coupon') || action.includes('promotion')) return { color: '#f59e0b', bg: 'bg-amber-500/10', icon: Zap }
  if (action.startsWith('inventory') || action.includes('stock')) return { color: '#f97316', bg: 'bg-orange-500/10', icon: Package }
  if (action.includes('refund') || action.includes('finance')) return { color: '#ef4444', bg: 'bg-rose-500/10', icon: DollarSign }
  if (action.startsWith('settings') || action.includes('plugin')) return { color: '#06b6d4', bg: 'bg-cyan-500/10', icon: Settings }
  if (action.includes('login') || action.includes('auth')) return { color: '#8b5cf6', bg: 'bg-violet-500/10', icon: Shield }
  return { color: '#6b7280', bg: 'bg-gray-500/10', icon: Activity }
}

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: '#ef4444',
  ADMIN: '#8b5cf6',
  MARKETING: '#ec4899',
  FINANCE: '#10b981',
  OPERATIONS: '#3b82f6',
  OFFERS: '#f59e0b',
}

interface AuditLog {
  id: string; action: string; resourceType: string | null; resourceId: string | null
  payload: unknown; ipAddress: string | null; employeeName: string; role: string; createdAt: string
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const params = new URLSearchParams({ page: String(page), limit: '30' })
  if (search) params.set('search', search)
  const url = `/api/portal/audit?${params}`

  const { data, isLoading } = useSWR(url, fetcher)
  const logs: AuditLog[] = data?.items ?? []
  const pagination = data?.pagination

  const getPayloadSummary = (payload: unknown): string => {
    if (!payload) return ''
    if (typeof payload === 'string') return payload
    const p = payload as Record<string, unknown>
    if (p.context && typeof p.context === 'object') {
      return Object.entries(p.context as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    }
    return JSON.stringify(payload).slice(0, 80)
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--portal-text)' }}>Audit Logs</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
              {pagination ? `${pagination.total.toLocaleString()} total entries` : 'Complete record of all employee actions'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
            <Shield size={13} /> RBAC Protected
          </div>
        </motion.div>

        {/* Search */}
        <motion.div variants={fadeUpVariants} className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
          <input placeholder="Search by action or employee name..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
        </motion.div>

        {/* Timeline-style log entries */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  <div className="w-8 h-8 rounded-xl animate-pulse" style={{ background: 'var(--portal-elevated)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-48 rounded-full animate-pulse" style={{ background: 'var(--portal-elevated)' }} />
                    <div className="h-2 w-32 rounded-full animate-pulse" style={{ background: 'var(--portal-elevated)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center">
              <Activity size={40} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--portal-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--portal-muted)' }}>No audit logs found</p>
            </div>
          ) : (
            logs.map((log, i) => {
              const meta = getActionMeta(log.action)
              const ActionIcon = meta.icon
              const roleColor = ROLE_COLORS[log.role] || '#6b7280'
              const detail = getPayloadSummary(log.payload)
              return (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="px-5 py-3.5 flex items-start gap-4 hover:bg-white/[0.015] transition-colors group"
                  style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--portal-border)' : undefined }}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg}`}>
                    <ActionIcon size={14} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold" style={{ color: meta.color }}>{log.action}</span>
                      {log.resourceType && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--portal-elevated)', color: 'var(--portal-muted)' }}>
                          {log.resourceType}{log.resourceId ? ` #${log.resourceId.slice(-6)}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <User2 size={10} style={{ color: 'var(--portal-muted)' }} />
                        <span className="text-[11px] font-medium" style={{ color: 'var(--portal-text)' }}>{log.employeeName}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                        style={{ background: `${roleColor}15`, color: roleColor }}>{log.role}</span>
                      {log.ipAddress && (
                        <span className="text-[10px] font-mono" style={{ color: 'var(--portal-muted)' }}>{log.ipAddress}</span>
                      )}
                    </div>
                    {detail && (
                      <p className="text-[10px] mt-1 truncate max-w-md" style={{ color: 'var(--portal-muted)' }}>{detail}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] font-medium tabular-nums" style={{ color: 'var(--portal-muted)' }}>
                      {new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                    <p className="text-[10px] tabular-nums" style={{ color: 'var(--portal-muted)' }}>
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              )
            })
          )}
        </motion.div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <motion.div variants={fadeUpVariants} className="flex items-center justify-between px-1">
            <p className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
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
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}
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
