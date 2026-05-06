'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Send, MessageSquare, User, Package, Clock, AlertCircle,
  CheckCircle, Hash, Mail, Phone
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  OPEN:             { color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Open' },
  IN_PROGRESS:      { color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'In Progress' },
  WAITING_CUSTOMER: { color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Waiting' },
  RESOLVED:         { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Resolved' },
  CLOSED:           { color: 'text-white/30',    bg: 'bg-white/5',        label: 'Closed' },
}

const STATUS_OPTIONS = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']

interface TicketData {
  id: string; subject: string; message: string; status: string; priority: string
  orderId: string | null; assignedTo: string | null; createdAt: string; updatedAt: string
  customer: { id: string | null; name: string | null; email: string; phone: string | null }
  order: { id: string; orderNumber: string; status: string; total: number; createdAt: string } | null
  replies: { id: string; message: string; isStaff: boolean; authorId: string | null; createdAt: string }[]
}

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: ticket, isLoading, mutate: mutateTicket } = useSWR<TicketData>(
    `/api/portal/support/${id}`,
    fetcher,
    { refreshInterval: 5000 }
  )
  const [replyMessage, setReplyMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.replies?.length])

  const handleReply = async () => {
    if (!replyMessage.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/portal/support/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: replyMessage.trim() }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Failed') }
      setReplyMessage('')
      mutateTicket()
      mutate('/api/portal/support')
      toast.success('Reply sent')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally { setSending(false) }
  }

  const handleStatusChange = async (status: string) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/portal/support/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      mutateTicket()
      mutate('/api/portal/support')
      toast.success(`Status updated to ${status}`)
    } catch {
      toast.error('Failed to update status')
    } finally { setUpdatingStatus(false) }
  }

  return (
    <PortalShell>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : !ticket ? (
        <div className="text-center py-20">
          <MessageSquare size={48} className="mx-auto text-white/10 mb-4" strokeWidth={1} />
          <p className="text-white/40">Ticket not found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Chat Column */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
              <button onClick={() => router.push('/admin/dashboard/support')} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                <ArrowLeft size={20} className="text-white/60" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-white truncate">{ticket.subject}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusConfig[ticket.status]?.bg} ${statusConfig[ticket.status]?.color}`}>
                    {statusConfig[ticket.status]?.label || ticket.status}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    ticket.priority === 'HIGH' ? 'text-rose-400 bg-rose-500/10' : ticket.priority === 'LOW' ? 'text-white/40 bg-white/5' : 'text-amber-400 bg-amber-500/10'
                  }`}>
                    {ticket.priority}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {/* Initial message */}
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-[10px] font-semibold text-violet-400 mb-1">{ticket.customer.name || ticket.customer.email}</p>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{ticket.message}</p>
                  <p className="text-[10px] text-white/20 mt-1.5">
                    {new Date(ticket.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Replies */}
              {ticket.replies.map(reply => (
                <div key={reply.id} className={`flex ${reply.isStaff ? 'justify-end' : 'justify-start'}`}>
                  <motion.div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      reply.isStaff
                        ? 'bg-violet-600/20 border border-violet-500/20 rounded-br-md'
                        : 'bg-white/5 border border-white/10 rounded-bl-md'
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springs.gentle}
                  >
                    <p className={`text-[10px] font-semibold mb-1 ${reply.isStaff ? 'text-violet-400' : 'text-blue-400'}`}>
                      {reply.isStaff ? 'Support Team' : (ticket.customer.name || 'Customer')}
                    </p>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{reply.message}</p>
                    <p className="text-[10px] text-white/20 mt-1.5 text-right">
                      {new Date(reply.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </motion.div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input */}
            <div className="pt-4 border-t border-white/10 mt-4">
              <div className="flex items-end gap-2">
                <textarea
                  value={replyMessage}
                  onChange={e => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  rows={2}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none max-h-28"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply() }
                  }}
                />
                <motion.button
                  onClick={handleReply}
                  disabled={!replyMessage.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  <Send size={18} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 overflow-y-auto">
            {/* Status Update */}
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Status</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {STATUS_OPTIONS.map(s => {
                  const cfg = statusConfig[s]
                  const isActive = ticket.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => !isActive && handleStatusChange(s)}
                      disabled={isActive || updatingStatus}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive ? `${cfg.bg} ${cfg.color} ring-1 ring-current` : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                      } disabled:cursor-default`}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Customer Info */}
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={12} /> Customer
              </h3>
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">{ticket.customer.name || 'Guest'}</p>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Mail size={12} /> {ticket.customer.email}
                </div>
                {ticket.customer.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-white/40">
                    <Phone size={12} /> {ticket.customer.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Linked Order */}
            {ticket.order && (
              <Link href={`/admin/dashboard/orders/${ticket.order.id}`}>
                <div className="rounded-xl border border-white/10 p-4 hover:bg-white/[0.03] transition-colors">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Package size={12} /> Linked Order
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-1">
                        <Hash size={12} />{ticket.order.orderNumber}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">{formatPrice(ticket.order.total)}</p>
                      <p className="text-[10px] text-white/20 mt-0.5">
                        {new Date(ticket.order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      ticket.order.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-400' :
                      ticket.order.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {ticket.order.status}
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Ticket Meta */}
            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Details</h3>
              <div className="space-y-2 text-xs text-white/40">
                <div className="flex justify-between"><span>Created</span><span className="text-white/60">{new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                <div className="flex justify-between"><span>Updated</span><span className="text-white/60">{new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                <div className="flex justify-between"><span>Priority</span><span className={`font-semibold ${ticket.priority === 'HIGH' ? 'text-rose-400' : ticket.priority === 'LOW' ? 'text-white/30' : 'text-amber-400'}`}>{ticket.priority}</span></div>
                <div className="flex justify-between"><span>Replies</span><span className="text-white/60">{ticket.replies.length}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  )
}
