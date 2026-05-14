'use client'
import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronLeft, ChevronRight, UserPlus, Shield, ShieldCheck,
  User2, Mail, Clock, Activity, Eye, EyeOff, Loader2, X, Lock
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'
import { CredentialGate } from '@/components/portal/shared/CredentialGate'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  SUPERADMIN: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  ADMIN:      { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  MARKETING:  { bg: 'bg-pink-500/10', text: 'text-pink-400' },
  FINANCE:    { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  OPERATIONS: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  OFFERS:     { bg: 'bg-amber-500/10', text: 'text-amber-400' },
}

const ROLES = ['SUPERADMIN', 'ADMIN', 'MARKETING', 'FINANCE', 'OPERATIONS', 'OFFERS'] as const

interface Employee {
  id: string; name: string; email: string; role: string
  isActive: boolean; twoFaEnabled: boolean; lastLoginAt: string | null
  createdAt: string; auditCount: number; avatar: string | null
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [elevated, setElevated] = useState(false)

  const params = new URLSearchParams({ page: String(page), limit: '20', status: statusFilter })
  if (search) params.set('search', search)
  if (roleFilter) params.set('role', roleFilter)
  const url = `/api/portal/employees?${params}`

  const { data, isLoading, mutate } = useSWR(url, fetcher)
  const employees: Employee[] = data?.items ?? []
  const pagination = data?.pagination

  const handleDeactivate = useCallback(async (emp: Employee) => {
    if (!confirm(`Deactivate "${emp.name}" (${emp.email})? They will lose access immediately.`)) return
    try {
      const res = await fetch(`/api/portal/employees/${emp.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed')
      }
      toast.success(`${emp.name} deactivated`)
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to deactivate')
    }
  }, [mutate])

  const handleReactivate = useCallback(async (emp: Employee) => {
    try {
      const res = await fetch(`/api/portal/employees/${emp.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed')
      }
      toast.success(`${emp.name} reactivated`)
      mutate()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reactivate')
    }
  }, [mutate])

  // Gate: require credential elevation before any mutation
  if (!elevated) {
    return (
      <PortalShell>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--portal-accent)', color: '#fff' }}>
              <Lock size={24} />
            </div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Employee Management</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
              Verify your credentials to access this sensitive area
            </p>
          </div>
          <CredentialGate
            action="access employee management"
            onSuccess={() => setElevated(true)}
            onCancel={() => window.history.back()}
          />
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
            <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--portal-text)' }}>Employees</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
              {pagination ? `${pagination.total} team members` : 'Manage your team & permissions'}
            </p>
          </div>
          <ClayButton variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus size={16} /> Invite Employee
          </ClayButton>
        </motion.div>

        {/* Filters */}
        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <input placeholder="Search by name or email..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
          </div>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
            className="px-4 py-3 rounded-2xl text-xs font-medium appearance-none cursor-pointer focus:outline-none"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as 'all' | 'active' | 'inactive'); setPage(1) }}
            className="px-4 py-3 rounded-2xl text-xs font-medium appearance-none cursor-pointer focus:outline-none"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </motion.div>

        {/* Employee Table */}
        <motion.div variants={fadeUpVariants} className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['Employee', 'Role', '2FA', 'Last Login', 'Actions', 'Status', 'Joined'].map(h => (
                    <th key={h} className="text-left px-4 py-3.5 text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded-full animate-pulse" style={{ width: `${40 + Math.random() * 40}%`, background: 'var(--portal-elevated)' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-20 text-center">
                      <User2 size={40} className="mx-auto mb-3 opacity-15" style={{ color: 'var(--portal-muted)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--portal-muted)' }}>No employees found</p>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, i) => {
                    const rc = ROLE_COLORS[emp.role] || ROLE_COLORS.ADMIN
                    return (
                      <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: i < employees.length - 1 ? '1px solid var(--portal-border)' : undefined }}
                        className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, var(--portal-accent), #8b5cf6)' }}>
                              {emp.name[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--portal-text)' }}>{emp.name}</p>
                              <p className="text-[10px] flex items-center gap-1 truncate" style={{ color: 'var(--portal-muted)' }}>
                                <Mail size={9} /> {emp.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${rc.bg} ${rc.text}`}>
                            <Shield size={9} /> {emp.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {emp.twoFaEnabled ? (
                            <ShieldCheck size={14} className="text-emerald-400" />
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Off</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--portal-muted)' }}>
                          {emp.lastLoginAt
                            ? new Date(emp.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Never'}
                        </td>
                        <td className="px-4 py-3.5 text-xs tabular-nums" style={{ color: 'var(--portal-muted)' }}>
                          <span className="flex items-center gap-1"><Activity size={10} /> {emp.auditCount} actions</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {emp.isActive ? (
                            <button onClick={() => handleDeactivate(emp)}
                              className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer">
                              Active
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(emp)}
                              className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer">
                              Inactive
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs tabular-nums" style={{ color: 'var(--portal-muted)' }}>
                          {new Date(emp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                      </motion.tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <motion.div variants={fadeUpVariants} className="flex items-center justify-between px-1">
            <p className="text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-xl disabled:opacity-20" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, k) => {
                let pg = k + 1
                if (pagination.totalPages > 5) {
                  const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4))
                  pg = start + k
                }
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className="w-8 h-8 rounded-xl text-xs font-semibold"
                    style={{ background: page === pg ? 'var(--portal-accent)' : 'transparent', color: page === pg ? '#fff' : 'var(--portal-muted)' }}>
                    {pg}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasMore}
                className="p-2 rounded-xl disabled:opacity-20" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-muted)' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Create Employee Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateEmployeeModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); mutate() }} />
        )}
      </AnimatePresence>
    </PortalShell>
  )
}

/* ── Create Employee Modal ── */
function CreateEmployeeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'ADMIN', password: '' })
  const [saving, setSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/portal/employees', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to create employee')
      }
      toast.success(`${form.name} invited successfully!`)
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={18} style={{ color: 'var(--portal-accent)' }} />
            <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>Invite Employee</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--portal-muted)' }}>Full Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required placeholder="John Doe"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
              style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--portal-muted)' }}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required placeholder="employee@company.com"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
              style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--portal-muted)' }}>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
              style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}>
              {ROLES.filter(r => r !== 'SUPERADMIN').map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--portal-muted)' }}>Initial Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={8} placeholder="Min 8 characters"
                className="w-full px-4 py-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/50"
                style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <ClayButton type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</ClayButton>
            <ClayButton type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Create Employee
            </ClayButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
