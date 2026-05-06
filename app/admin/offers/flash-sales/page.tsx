'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Zap, Clock, CheckCircle2, Calendar } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

interface FlashSale {
  id: string; name: string; slug: string; bannerImage: string | null
  startDate: string; endDate: string; isActive: boolean; displayCountdown: boolean
  status: string; productCount: number; totalSold: number; totalStock: number; sellThroughRate: number
  products: { id: string; productId: string; discountType: string; discountValue: number; salePrice: number; stockLimit: number | null; soldCount: number }[]
  createdAt: string
}

const statusCfg: Record<string, { color: string; icon: typeof Zap }> = {
  live: { color: '#2f9e44', icon: Zap },
  upcoming: { color: '#339af0', icon: Calendar },
  ended: { color: '#868e96', icon: CheckCircle2 },
}

export default function FlashSalesPage() {
  const [items, setItems] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '12', status })
    fetch(`/api/portal/offers/flash-sales?${params}`)
      .then(r => r.json())
      .then(d => { if (d.data) { setItems(d.data.items ?? []); setTotalPages(d.data.pagination?.totalPages ?? 1) } })
      .catch(() => {}).finally(() => setLoading(false))
  }, [page, status])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <Link href="/admin/offers" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Flash Sales</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Time-limited promotional events</p>
          </div>
        </motion.div>

        {/* Status filters */}
        <motion.div variants={fadeUpVariants} className="flex gap-2">
          {['all', 'active', 'upcoming', 'ended'].map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-colors capitalize"
              style={{ background: status === s ? 'var(--portal-accent)' : 'transparent', color: status === s ? '#fff' : 'var(--portal-muted)', border: `1px solid ${status === s ? 'var(--portal-accent)' : 'var(--portal-border)'}` }}>
              {s}
            </button>
          ))}
        </motion.div>

        {/* Flash sale cards */}
        <motion.div variants={fadeUpVariants}>
          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                  <div className="h-4 w-40 rounded bg-white/10 mb-3" />
                  <div className="h-3 w-28 rounded bg-white/10 mb-2" />
                  <div className="h-3 w-32 rounded bg-white/10" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No flash sales found</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {items.map(sale => {
                const cfg = statusCfg[sale.status] ?? statusCfg.ended
                const Icon = cfg.icon
                const timeLeft = sale.status === 'live' ? getTimeLeft(sale.endDate) : sale.status === 'upcoming' ? `Starts ${new Date(sale.startDate).toLocaleDateString()}` : `Ended ${new Date(sale.endDate).toLocaleDateString()}`

                return (
                  <motion.div key={sale.id} className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
                    whileHover={{ y: -2, borderColor: cfg.color }} transition={springs.gentle}>
                    {/* Header */}
                    <div className="p-4" style={{ borderBottom: '1px solid var(--portal-border)' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--portal-text)' }}>{sale.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{ background: `${cfg.color}15`, color: cfg.color }}>
                              <Icon size={10} /> {sale.status.toUpperCase()}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{sale.productCount} products</span>
                          </div>
                        </div>
                        {sale.status === 'live' && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: '#2f9e4415' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[10px] font-semibold text-green-400">LIVE</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-3 mb-3">
                        <div>
                          <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Sold</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>{sale.totalSold}</p>
                        </div>
                        <div>
                          <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Stock</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>{sale.totalStock}</p>
                        </div>
                        <div>
                          <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Sell-through</p>
                          <p className="text-sm font-bold" style={{ color: sale.sellThroughRate >= 70 ? '#2f9e44' : sale.sellThroughRate >= 30 ? '#f08c00' : 'var(--portal-text)' }}>{sale.sellThroughRate}%</p>
                        </div>
                        <div>
                          <p className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Products</p>
                          <p className="text-sm font-bold" style={{ color: 'var(--portal-text)' }}>{sale.productCount}</p>
                        </div>
                      </div>

                      {/* Sell-through bar */}
                      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--portal-border)' }}>
                        <motion.div className="h-full rounded-full" style={{ background: cfg.color }}
                          initial={{ width: 0 }} animate={{ width: `${sale.sellThroughRate}%` }}
                          transition={{ duration: 0.8 }} />
                      </div>

                      <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--portal-muted)' }}>
                        <Clock size={10} /> {timeLeft}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl text-xs disabled:opacity-30" style={{ color: 'var(--portal-muted)', border: '1px solid var(--portal-border)' }}>Previous</button>
            <span className="text-xs" style={{ color: 'var(--portal-muted)' }}>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl text-xs disabled:opacity-30" style={{ color: 'var(--portal-muted)', border: '1px solid var(--portal-border)' }}>Next</button>
          </div>
        )}
      </motion.div>
    </PortalShell>
  )
}

function getTimeLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`
  return `${hours}h ${mins}m left`
}
