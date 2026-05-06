'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, Table, Receipt, ShoppingBag } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue Report', desc: 'All paid orders with totals, taxes, discounts', icon: Receipt, color: '#2f9e44' },
  { value: 'refunds', label: 'Refunds Report', desc: 'Refund records with status and Razorpay IDs', icon: Table, color: '#e03131' },
  { value: 'gst', label: 'GST Report', desc: 'Tax breakdown: CGST, SGST, IGST per order', icon: FileText, color: '#f08c00' },
  { value: 'orders', label: 'Orders Report', desc: 'Full order data with customer details', icon: ShoppingBag, color: '#339af0' },
]

export default function ExportPage() {
  const [type, setType] = useState('revenue')
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [downloading, setDownloading] = useState(false)

  const handleExport = async () => {
    setDownloading(true)
    try {
      const params = new URLSearchParams({
        type,
        format,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      })
      const res = await fetch(`/api/portal/finance/export?${params}`)
      if (!res.ok) { toast.error('Export failed'); return }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] ?? `${type}-report.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch { toast.error('Download failed') }
    finally { setDownloading(false) }
  }

  const selected = REPORT_TYPES.find(r => r.value === type)

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <Link href="/admin/finance" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Export Reports</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Download financial data as CSV or JSON</p>
          </div>
        </motion.div>

        {/* Report type selector */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORT_TYPES.map(r => (
            <button key={r.value} onClick={() => setType(r.value)}
              className="p-4 rounded-2xl text-left transition-all"
              style={{ background: 'var(--portal-surface)', border: `1px solid ${type === r.value ? r.color : 'var(--portal-border)'}` }}>
              <r.icon size={20} style={{ color: r.color }} />
              <h3 className="font-semibold text-sm mt-2" style={{ color: 'var(--portal-text)' }}>{r.label}</h3>
              <p className="text-[10px] mt-1" style={{ color: 'var(--portal-muted)' }}>{r.desc}</p>
            </button>
          ))}
        </motion.div>

        {/* Configuration */}
        <motion.div variants={fadeUpVariants} className="p-6 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--portal-text)' }}>Export Configuration</h3>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Date range */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--portal-muted)' }}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)', colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--portal-muted)' }}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm bg-transparent outline-none"
                style={{ border: '1px solid var(--portal-border)', color: 'var(--portal-text)', colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--portal-muted)' }}>Format</label>
              <div className="flex gap-2">
                {(['csv', 'json'] as const).map(f => (
                  <button key={f} onClick={() => setFormat(f)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: format === f ? 'var(--portal-accent)' : 'transparent', color: format === f ? '#fff' : 'var(--portal-muted)', border: `1px solid ${format === f ? 'var(--portal-accent)' : 'var(--portal-border)'}` }}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--portal-bg)' }}>
            <div className="flex items-center gap-3">
              {selected && <selected.icon size={16} style={{ color: selected.color }} />}
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{selected?.label}</p>
                <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                  {startDate} to {endDate} &middot; {format.toUpperCase()} format
                </p>
              </div>
              <motion.button onClick={handleExport} disabled={downloading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--portal-accent)', color: '#fff' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springs.snappy}>
                <Download size={14} />
                {downloading ? 'Downloading...' : 'Export'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </PortalShell>
  )
}
