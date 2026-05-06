'use client'
import { useState, useEffect, useRef, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, ArrowLeft, Clock, CheckCircle, AlertCircle,
  ChevronRight, Bot, UserCircle, Sparkles, Lock
} from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { springs } from '@/lib/animations'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

// ─── TYPES ──────────────────────────────────
interface ChatMsg {
  id: string
  sender: 'CUSTOMER' | 'BOT' | 'SYSTEM'
  text: string
  intent?: string | null
  sentiment?: string | null
  metadata?: Record<string, unknown> | null
  showOptions?: { label: string; value: string }[]
  createdAt: Date | string
  isTyping?: boolean
}

interface Ticket {
  id: string; subject: string; status: string; priority: string; orderId: string | null
  createdAt: string; updatedAt: string; replyCount: number
  lastReply: { message: string; isStaff: boolean; createdAt: string } | null
}

interface TicketDetail {
  id: string; subject: string; message: string; status: string; priority: string
  orderId: string | null; createdAt: string
  replies: { id: string; message: string; isStaff: boolean; createdAt: string }[]
}

// ─── TICKET STATUS CONFIG ───────────────────
const ticketStatusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  OPEN: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
  IN_PROGRESS: { icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50' },
  WAITING_CUSTOMER: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
  RESOLVED: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  CLOSED: { icon: CheckCircle, color: 'text-gray-400', bg: 'bg-gray-50' },
}

// ─── CHAT API CALLER ────────────────────────
async function chatAPI(body: Record<string, unknown>) {
  const res = await fetch('/api/storefront/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message || 'Chat failed')
  return json.data
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════

function HelpContent() {
  const { user } = useAuth()
  const params = useSearchParams()

  // ─── State ──────────────────────────────────
  const [view, setView] = useState<'bot' | 'escalate' | 'tickets' | 'chat'>('bot')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Escalation
  const [escalateSubject, setEscalateSubject] = useState('Support Request')
  const [escalateMessage, setEscalateMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Tickets
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [ticketSending, setTicketSending] = useState(false)

  // Refs
  const messagesRef = useRef<HTMLDivElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // SWR
  const { data: ticketsData } = useSWR(view === 'tickets' ? '/api/storefront/support' : null, fetcher)
  const { data: ticketDetail, mutate: mutateDetail } = useSWR(
    activeTicketId ? `/api/storefront/support/${activeTicketId}` : null,
    fetcher,
    { refreshInterval: view === 'chat' ? 5000 : 0 }
  )

  // ─── Load chat history from DB on mount ────
  useEffect(() => {
    if (!user || loaded) return
    const loadChat = async () => {
      try {
        const res = await fetch('/api/storefront/chat', { credentials: 'include' })
        const json = await res.json()
        const data = json.data

        if (data?.session && data.messages?.length > 0) {
          setSessionId(data.session.id)

          // Restore selectedOrderId from session context
          const ctx = data.session.context as Record<string, unknown> | null
          if (ctx?.selectedOrderId) {
            setSelectedOrderId(ctx.selectedOrderId as string)
          }

          // Map messages and add continue-options to the last bot message
          const mapped: ChatMsg[] = data.messages.map((m: { id: string; sender: string; text: string; intent?: string; sentiment?: string; metadata?: Record<string, unknown>; createdAt: string }) => ({
            id: m.id,
            sender: m.sender as ChatMsg['sender'],
            text: m.text,
            intent: m.intent,
            sentiment: m.sentiment,
            metadata: m.metadata,
            createdAt: new Date(m.createdAt),
          }))

          // Append a welcome-back message with options so the user can continue
          const name = user?.name?.split(' ')[0] || 'there'
          mapped.push({
            id: `wb-${Date.now()}`,
            sender: 'BOT',
            text: `Welcome back, ${name}! 👋 I've loaded your previous conversation. How can I continue helping you?`,
            createdAt: new Date(),
            showOptions: ctx?.selectedOrderId
              ? [
                  { label: '📍 Track my order', value: 'track_order' },
                  { label: '📦 Order status', value: 'order_status' },
                  { label: '🚚 Delivery info', value: 'delivery_time' },
                  { label: '🔄 Different order', value: 'show_orders' },
                  { label: '👤 Talk to support', value: 'talk_to_human' },
                ]
              : [
                  { label: '📦 Help with an order', value: 'show_orders' },
                  { label: '🚚 Shipping & Delivery', value: 'delivery_time' },
                  { label: '↩️ Returns & Refunds', value: 'refund_status' },
                  { label: '👤 Talk to support', value: 'talk_to_human' },
                ],
          })

          setMessages(mapped)
        } else {
          await sendFirstMessage()
        }
      } catch {
        await sendFirstMessage()
      }
      setLoaded(true)
    }

    const sendFirstMessage = async () => {
      const name = user?.name?.split(' ')[0] || 'there'
      const ts = Date.now()
      setMessages([{
        id: `greet-${ts}`,
        sender: 'BOT',
        text: '',
        isTyping: true,
        createdAt: new Date(),
      }])

      try {
        const prefillOrder = params.get('orderId') || params.get('orderNumber')
        const msg = prefillOrder
          ? `I need help with order ${prefillOrder}`
          : 'hi'
        const data = await chatAPI({ message: msg, action: 'send' })
        setSessionId(data.sessionId)
        setMessages([{
          id: data.botReply?.intent || `greet-${ts}`,
          sender: 'BOT',
          text: data.botReply?.text || `Hey ${name}! 👋 How can I help you today?`,
          intent: data.botReply?.intent,
          showOptions: data.botReply?.showOptions,
          createdAt: new Date(),
        }])
      } catch {
        setMessages([{
          id: `greet-${ts}`,
          sender: 'BOT',
          text: `Hey ${name}! 👋 How can I help you today? Just type your question naturally.`,
          createdAt: new Date(),
        }])
      }
    }

    loadChat()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Auto-scroll — scroll only inside the messages container, never the page
  const scrollMessages = useCallback(() => {
    setTimeout(() => {
      const el = messagesRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }, 80)
  }, [])

  const scrollTicketChat = useCallback(() => {
    setTimeout(() => {
      const el = chatMessagesRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }, 80)
  }, [])

  useEffect(() => { scrollMessages() }, [messages.length, scrollMessages])
  useEffect(() => {
    if (view === 'chat') scrollTicketChat()
  }, [ticketDetail?.replies?.length, view, scrollTicketChat])

  // ─── Send Message ──────────────────────────
  const handleSend = useCallback(async (textOverride?: string) => {
    const text = (textOverride || input).trim()
    if (!text || sending) return
    if (!textOverride) setInput('')
    setSending(true)

    const ts = Date.now()

    // Add user message
    setMessages(prev => [...prev, {
      id: `u-${ts}`,
      sender: 'CUSTOMER',
      text,
      createdAt: new Date(),
    }])

    // Add typing indicator
    setMessages(prev => [...prev, {
      id: `typing-${ts}`,
      sender: 'BOT',
      text: '',
      isTyping: true,
      createdAt: new Date(),
    }])

    try {
      const data = await chatAPI({ message: text, sessionId, action: 'send' })
      if (data.sessionId) setSessionId(data.sessionId)

      // Replace typing with actual response
      setMessages(prev => prev
        .filter(m => m.id !== `typing-${ts}`)
        .concat({
          id: `b-${ts}`,
          sender: 'BOT',
          text: data.botReply.text,
          intent: data.botReply.intent,
          sentiment: data.botReply.sentiment,
          metadata: data.botReply.metadata,
          showOptions: data.botReply.showOptions,
          createdAt: new Date(),
        })
      )

      // Track selected order from metadata
      if (data.botReply.metadata?.selectedOrderId) {
        setSelectedOrderId(data.botReply.metadata.selectedOrderId as string)
      }

      // Auto-escalate
      if (data.botReply.needsEscalation) {
        setEscalateSubject(data.botReply.escalationSubject || 'Support Request')
        setView('escalate')
      }
    } catch {
      setMessages(prev => prev
        .filter(m => m.id !== `typing-${ts}`)
        .concat({
          id: `err-${ts}`,
          sender: 'BOT',
          text: "I'm having a little trouble right now. Please try again or I can connect you with our team.",
          showOptions: [{ label: 'Talk to support', value: 'talk_to_human' }],
          createdAt: new Date(),
        })
      )
    } finally {
      setSending(false)
      setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true })
        scrollMessages()
      }, 120)
    }
  }, [input, sending, sessionId, scrollMessages])

  // ─── Handle option click ───────────────────
  const handleOption = useCallback(async (value: string, label: string) => {
    if (value.startsWith('order_')) {
      const orderId = value.replace('order_', '')
      const ts = Date.now()
      setMessages(prev => [...prev,
        { id: `u-${ts}`, sender: 'CUSTOMER' as const, text: label, createdAt: new Date() },
        { id: `typing-${ts}`, sender: 'BOT' as const, text: '', isTyping: true, createdAt: new Date() },
      ])

      try {
        const data = await chatAPI({ sessionId, action: 'select_order', orderId })
        if (data.sessionId) setSessionId(data.sessionId)
        setSelectedOrderId(orderId)

        setMessages(prev => prev
          .filter(m => m.id !== `typing-${ts}`)
          .concat({
            id: `b-${ts}`,
            sender: 'BOT',
            text: data.botReply.text,
            showOptions: data.botReply.showOptions,
            metadata: data.botReply.metadata,
            createdAt: new Date(),
          })
        )
      } catch {
        setMessages(prev => prev.filter(m => m.id !== `typing-${ts}`))
      }
      return
    }

    if (value === 'show_orders') {
      handleSend('show me my orders')
      return
    }

    if (value === 'escalate' || value === 'talk_to_human') {
      setView('escalate')
      return
    }

    // Map option values to natural-language queries the bot can understand
    const valueToMessage: Record<string, string> = {
      track_order: 'track my order',
      order_status: 'what is my order status',
      delivery_time: 'when will my order be delivered',
      cancel_order: 'I want to cancel my order',
      return_item: 'I want to return my order',
      refund_status: 'what is my refund status',
      payment_issue: 'I have a payment issue',
      thanks: 'thank you',
      general_help: 'I need help',
    }

    const mappedMsg = valueToMessage[value]
    if (mappedMsg) {
      handleSend(mappedMsg)
      return
    }

    // Fallback: send the label as a message
    handleSend(label)
  }, [sessionId, handleSend])

  // ─── Create ticket (escalate) ──────────────
  const handleCreateTicket = async () => {
    if (!escalateMessage.trim()) { toast.error('Please describe your issue'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/storefront/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: escalateSubject,
          message: escalateMessage.trim(),
          orderId: selectedOrderId || undefined,
          priority: 'MEDIUM',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed')
      toast.success('Connected with support team!')
      setActiveTicketId(json.data.id)
      setView('chat')
      setEscalateMessage('')
      mutate('/api/storefront/support')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally { setCreating(false) }
  }

  // ─── Send ticket message ───────────────────
  const handleSendTicketMessage = async () => {
    if (!chatMessage.trim() || !activeTicketId) return
    setTicketSending(true)
    try {
      const res = await fetch(`/api/storefront/support/${activeTicketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: chatMessage.trim() }),
      })
      if (!res.ok) { const j = await res.json(); throw new Error(j.message || 'Failed') }
      setChatMessage('')
      mutateDetail()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally { setTicketSending(false) }
  }

  // ═══════════════════════════════════════════
  // RENDER: BOT CHAT VIEW
  // ═══════════════════════════════════════════
  if (view === 'bot' || view === 'escalate') {
    return (
      <div className="flex flex-col h-[calc(100dvh-280px)] md:h-[calc(100dvh-220px)] max-h-[700px] overflow-hidden" style={{ contain: 'layout' }}>
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-clay-divider mb-3">
          <div className="w-9 h-9 rounded-xl bg-clay-blush flex items-center justify-center relative">
            <Bot size={18} className="text-clay-rose" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-clay-text">Support Assistant</h3>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-emerald-500 font-medium">● Online</p>
              <Lock size={8} className="text-clay-text-muted" />
              <span className="text-[9px] text-clay-text-muted">E2E Encrypted</span>
            </div>
          </div>
          <button
            onClick={() => setView('tickets')}
            className="text-[11px] font-semibold text-clay-rose hover:text-clay-rose-dark transition-colors px-3 py-1.5 rounded-xl hover:bg-clay-blush"
          >
            My Tickets
          </button>
        </div>

        {/* Messages */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 overscroll-contain">
          <AnimatePresence mode="popLayout">
            {messages.map(msg => {
              // Typing indicator
              if (msg.isTyping) {
                return (
                  <motion.div
                    key={msg.id}
                    className="flex items-start gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-clay-blush flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={13} className="text-clay-rose" />
                    </div>
                    <div className="bg-clay-bg-sunken rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-clay-text-muted"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )
              }

              // Bot message
              if (msg.sender === 'BOT') {
                return (
                  <div key={msg.id}>
                    <motion.div
                      className="flex items-start gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="w-7 h-7 rounded-lg bg-clay-blush flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot size={13} className="text-clay-rose" />
                      </div>
                      <div className="max-w-[85%] bg-clay-bg-sunken rounded-2xl rounded-bl-md px-3.5 py-2.5">
                        <p className="text-sm text-clay-text whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <p className="text-[9px] text-clay-text-muted mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>

                    {/* Options */}
                    {msg.showOptions && msg.showOptions.length > 0 && (
                      <motion.div
                        className="flex flex-wrap gap-1.5 pl-9 mt-2"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                      >
                        {msg.showOptions.map((opt, i) => (
                          <motion.button
                            key={`${msg.id}-opt-${i}`}
                            onClick={() => handleOption(opt.value, opt.label)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-clay-rose/20 bg-white hover:bg-clay-blush text-clay-rose text-[12px] font-semibold transition-all active:scale-95"
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {opt.label}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )
              }

              // Customer message
              if (msg.sender === 'CUSTOMER') {
                return (
                  <motion.div
                    key={msg.id}
                    className="flex justify-end"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="max-w-[80%] bg-clay-rose text-white rounded-2xl rounded-br-md px-3.5 py-2.5">
                      <p className="text-sm">{msg.text}</p>
                      <p className="text-[9px] text-white/50 mt-0.5 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                )
              }

              return null
            })}
          </AnimatePresence>
        </div>

        {/* Escalation form */}
        {view === 'escalate' ? (
          <motion.div
            className="pt-3 border-t border-clay-divider mt-3 space-y-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-[11px] font-semibold text-clay-text-muted uppercase tracking-wider">
              Describe your issue for our team
            </p>
            <textarea
              value={escalateMessage}
              onChange={e => setEscalateMessage(e.target.value)}
              placeholder="Tell us more about your issue..."
              rows={3}
              className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose/40 resize-none"
            />
            <div className="flex gap-2">
              <ClayButton variant="primary" className="flex-1 !rounded-xl" onClick={handleCreateTicket} loading={creating}>
                <Send size={14} className="mr-1.5" /> Connect with Support
              </ClayButton>
              <ClayButton variant="ghost" className="!rounded-xl" onClick={() => setView('bot')}>
                Cancel
              </ClayButton>
            </div>
          </motion.div>
        ) : (
          /* Free text input — primary interaction mode */
          <div className="pt-3 border-t border-clay-divider mt-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-clay-bg-sunken border border-clay-border-light rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose/40"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                disabled={sending}
              />
              <motion.button
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="w-10 h-10 rounded-xl bg-clay-rose text-white flex items-center justify-center disabled:opacity-40"
                whileTap={{ scale: 0.9 }}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // RENDER: TICKET LIST
  // ═══════════════════════════════════════════
  if (view === 'tickets') {
    const tickets: Ticket[] = ticketsData?.items || []
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('bot')} className="p-1.5 rounded-xl hover:bg-clay-bg-sunken transition-colors">
            <ArrowLeft size={20} className="text-clay-text" />
          </button>
          <h2 className="font-display text-lg font-bold text-clay-text flex-1">My Tickets</h2>
        </div>

        {tickets.length === 0 ? (
          <div className="text-center py-12 clay-card rounded-2xl">
            <MessageSquare size={40} className="mx-auto text-clay-text-muted mb-3" strokeWidth={1} />
            <p className="text-sm text-clay-text-muted mb-3">No support tickets yet</p>
            <ClayButton variant="primary" size="sm" onClick={() => setView('bot')} className="!rounded-xl">
              <Bot size={14} className="mr-1" /> Chat with Assistant
            </ClayButton>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket: Ticket) => {
              const cfg = ticketStatusConfig[ticket.status] || ticketStatusConfig.OPEN
              const Icon = cfg.icon
              return (
                <motion.button
                  key={ticket.id}
                  className="clay-card p-4 rounded-2xl w-full text-left hover:bg-clay-bg-sunken/30 transition-colors"
                  onClick={() => { setActiveTicketId(ticket.id); setView('chat') }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-clay-text truncate flex-1">{ticket.subject}</p>
                        <ClayBadge variant={ticket.status === 'RESOLVED' ? 'success' : 'default'} size="sm">
                          {ticket.status.replace(/_/g, ' ')}
                        </ClayBadge>
                      </div>
                      {ticket.lastReply && (
                        <p className="text-xs text-clay-text-muted mt-1 line-clamp-1">
                          {ticket.lastReply.isStaff ? '↩ Support: ' : 'You: '}{ticket.lastReply.message}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-clay-text-muted">
                          {new Date(ticket.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-[10px] text-clay-text-muted">{ticket.replyCount} replies</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-clay-text-muted mt-1 flex-shrink-0" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // RENDER: HUMAN CHAT VIEW
  // ═══════════════════════════════════════════
  if (view === 'chat' && ticketDetail) {
    const isClosed = ticketDetail.status === 'CLOSED' || ticketDetail.status === 'RESOLVED'
    return (
      <motion.div className="flex flex-col h-[calc(100dvh-260px)] md:h-[calc(100dvh-210px)] max-h-[700px] overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 pb-3 border-b border-clay-divider mb-3">
          <button onClick={() => { setView('tickets'); setActiveTicketId(null) }} className="p-1.5 rounded-xl hover:bg-clay-bg-sunken transition-colors">
            <ArrowLeft size={20} className="text-clay-text" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <UserCircle size={16} className="text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-clay-text truncate">{ticketDetail.subject}</h3>
            <div className="flex items-center gap-2">
              <ClayBadge variant={isClosed ? 'success' : 'default'} size="sm">
                {ticketDetail.status.replace(/_/g, ' ')}
              </ClayBadge>
              <span className="text-[10px] text-clay-text-muted">Support Team</span>
            </div>
          </div>
        </div>

        <div ref={chatMessagesRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 overscroll-contain">
          <div className="text-center">
            <span className="text-[10px] text-clay-text-muted bg-clay-bg-sunken px-3 py-1 rounded-full">
              Connected with support team
            </span>
          </div>

          <div className="flex justify-end">
            <div className="max-w-[80%] bg-clay-rose text-white rounded-2xl rounded-br-md px-4 py-2.5">
              <p className="text-sm whitespace-pre-wrap">{ticketDetail.message}</p>
              <p className="text-[10px] text-white/60 mt-1 text-right">
                {new Date(ticketDetail.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          {ticketDetail.replies.map((reply: TicketDetail['replies'][0]) => (
            <div key={reply.id} className={`flex ${reply.isStaff ? 'justify-start' : 'justify-end'}`}>
              <motion.div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  reply.isStaff
                    ? 'bg-clay-bg-sunken text-clay-text rounded-bl-md'
                    : 'bg-clay-rose text-white rounded-br-md'
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.gentle}
              >
                {reply.isStaff && (
                  <p className="text-[10px] font-semibold text-violet-500 mb-1">Support Team</p>
                )}
                <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                <p className={`text-[10px] mt-1 text-right ${reply.isStaff ? 'text-clay-text-muted' : 'text-white/60'}`}>
                  {new Date(reply.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </p>
              </motion.div>
            </div>
          ))}
        </div>

        {!isClosed ? (
          <div className="pt-3 border-t border-clay-divider mt-3">
            <div className="flex items-end gap-2">
              <textarea
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                placeholder="Type your message..."
                rows={1}
                className="flex-1 bg-clay-bg-sunken border border-clay-border-light rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose/40 resize-none max-h-24"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendTicketMessage() }
                }}
              />
              <motion.button
                onClick={handleSendTicketMessage}
                disabled={!chatMessage.trim() || ticketSending}
                className="w-10 h-10 rounded-xl bg-clay-rose text-white flex items-center justify-center disabled:opacity-40"
                whileTap={{ scale: 0.9 }}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-clay-divider mt-3 text-center">
            <p className="text-sm text-clay-text-muted mb-2">This ticket is closed.</p>
            <ClayButton variant="secondary" size="sm" onClick={() => setView('bot')} className="!rounded-xl">
              <Bot size={14} className="mr-1" /> Back to Assistant
            </ClayButton>
          </div>
        )}
      </motion.div>
    )
  }

  // Fallback loading
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="clay-card h-16 animate-shimmer rounded-2xl" />
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════
// PAGE EXPORT
// ═══════════════════════════════════════════════
export default function HelpPage() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="clay-card h-16 animate-shimmer rounded-2xl" />)}
      </div>
    }>
      <HelpContent />
    </Suspense>
  )
}
