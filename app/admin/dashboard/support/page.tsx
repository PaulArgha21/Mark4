'use client'
import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MessageSquare, Search, AlertCircle, Clock, CheckCircle, ChevronRight,
  Filter, Inbox, ArrowUpRight, Package
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  OPEN:             { color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: AlertCircle,    label: 'Open' },
  IN_PROGRESS:      { color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: Clock,          label: 'In Progress' },
  WAITING_CUSTOMER: { color: 'text-violet-400',  bg: 'bg-violet-500/10',  icon: MessageSquare,  label: 'Waiting' },
  RESOLVED:         { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle,    label: 'Resolved' },
  CLOSED:           { color: 'text-white/30',    bg: 'bg-white/5',        icon: CheckCircle,    label: 'Closed' },
}

const priorityColors: Record<string, string> = {
  HIGH: 'text-rose-400 bg-rose-500/10',
  MEDIUM: 'text-amber-400 bg-amber-500/10',
  LOW: 'text-white/40 bg-white/5',
}

interface Ticket {
  id: string; subject: string; status: string; priority: string; email: string
  orderId: string | null; assignedTo: string | null; customerName: string
  createdAt: string; updatedAt: string; replyCount: number
  lastReply: { message: string; isStaff: boolean; createdAt: string } | null
}

interface SupportData {
  items: Ticket[]
  summary: { OPEN: number; IN_PROGRESS: number; WAITING_CUSTOMER: number; RESOLVED: number; CLOSED: number }
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const queryParams = new URLSearchParams()
  queryParams.set('page', String(page))
  queryParams.set('limit', '20')
  if (statusFilter) queryParams.set('status', statusFilter)
  if (priorityFilter) queryParams.set('priority', priorityFilter)
  if (search) queryParams.set('search', search)

  const { data, isLoading } = useSWR<SupportData>(`/api/portal/support?${queryParams}`, fetcher, { refreshInterval: 10000 })

  const tickets = data?.items || []
  const summary = data?.summary || { OPEN: 0, IN_PROGRESS: 0, WAITING_CUSTOMER: 0, RESOLVED: 0, CLOSED: 0 }
  const pagination = data?.pagination

  return (
    <PortalShell>
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare size={22} /> Support Tickets
            </h1>
            <p className="text-sm text-white/40 mt-0.5">Manage customer support requests</p>
          </div>
        </motion.div>

        {/* Status Summary */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'] as const).map(status => {
            const cfg = statusConfig[status]
            const Icon = cfg.icon
            const count = summary[status]
            const isActive = statusFilter === status
            return (
              <motion.button
                key={status}
                onClick={() => { setStatusFilter(isActive ? '' : status); setPage(1) }}
                className={`p-3 rounded-xl border transition-all text-left ${isActive ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/5'}`}
                whileTap={{ scale: 0.97 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                    <Icon size={12} className={cfg.color} />
                  </div>
                  <span className="text-xl font-bold text-white">{count}</span>
                </div>
                <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{cfg.label}</p>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by subject, email, or customer..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </motion.div>

        {/* Ticket List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <motion.div variants={fadeUpVariants} className="text-center py-16 border border-white/10 rounded-2xl">
            <Inbox size={48} className="mx-auto text-white/10 mb-3" strokeWidth={1} />
            <p className="text-white/40">No tickets found</p>
          </motion.div>
        ) : (
          <motion.div variants={fadeUpVariants} className="space-y-2">
            {tickets.map(ticket => {
              const cfg = statusConfig[ticket.status] || statusConfig.OPEN
              const Icon = cfg.icon
              return (
                <Link key={ticket.id} href={`/admin/dashboard/support/${ticket.id}`}>
                  <motion.div
                    className="p-4 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/[0.03] transition-all"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={14} className={cfg.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white truncate">{ticket.subject}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${priorityColors[ticket.priority] || priorityColors.MEDIUM}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-white/40">{ticket.customerName}</span>
                          {ticket.orderId && (
                            <span className="text-[10px] text-violet-400 flex items-center gap-0.5">
                              <Package size={10} /> Order linked
                            </span>
                          )}
                        </div>
                        {ticket.lastReply && (
                          <p className="text-xs text-white/30 mt-1 line-clamp-1">
                            {ticket.lastReply.isStaff ? '↩ Staff: ' : '← Customer: '}{ticket.lastReply.message}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <p className="text-[10px] text-white/20 mt-1">
                          {new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[10px] text-white/20">{ticket.replyCount} replies</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </motion.div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <motion.div variants={fadeUpVariants} className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/5 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-sm text-white/40">Page {page} of {pagination.totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/5 disabled:opacity-30"
            >
              Next
            </button>
          </motion.div>
        )}
      </motion.div>
    </PortalShell>
  )
}
