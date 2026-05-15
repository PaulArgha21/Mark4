'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Package, AlertTriangle, Truck, Factory, BarChart3 } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'

interface InventorySummary { totalSKUs: number; outOfStock: number; lowStock: number; totalQuantity: number; totalReserved: number; pendingPurchaseOrders: number; activeSuppliers: number }
interface StockItem { id: string; sku: string; productId: string; productName: string; size: string | null; color: string | null; quantity: number; reserved: number; available: number; isLowStock: boolean; isOutOfStock: boolean; lowStockThreshold: number }

export default function InventoryPortal() {
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/portal/inventory?limit=1').then(r => r.json()),
      fetch('/api/portal/inventory?filter=low_stock&limit=10&sort=quantity_asc').then(r => r.json()),
    ]).then(([summaryRes, lowRes]) => {
      if (summaryRes.data) setSummary(summaryRes.data.summary)
      if (lowRes.data) setLowStockItems(lowRes.data.items ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const stats = summary ? [
    { label: 'Total SKUs', value: summary.totalSKUs.toLocaleString(), icon: Package, color: '#339af0' },
    { label: 'Low Stock', value: summary.lowStock.toLocaleString(), icon: AlertTriangle, color: '#e03131' },
    { label: 'Out of Stock', value: summary.outOfStock.toLocaleString(), icon: BarChart3, color: '#f08c00' },
    { label: 'Pending POs', value: summary.pendingPurchaseOrders.toLocaleString(), icon: Truck, color: '#7950f2' },
    { label: 'Suppliers', value: summary.activeSuppliers.toLocaleString(), icon: Factory, color: '#2f9e44' },
  ] : []

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants}>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Inventory</h1>
          <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Stock management and supply chain</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="h-5 w-5 rounded bg-white/10 mb-2" /><div className="h-6 w-12 rounded bg-white/10" />
            </div>
          )) : stats.map(s => (
            <div key={s.label} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <s.icon size={20} style={{ color: s.color }} />
              <p className="font-display text-2xl font-bold mt-2" style={{ color: 'var(--portal-text)' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Links */}
        <motion.div variants={fadeUpVariants} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Stock Management', desc: 'View and adjust stock levels', href: '/admin/inventory/stock', icon: Package, color: '#339af0' },
            { title: 'Suppliers', desc: 'Manage supplier relationships', href: '/admin/inventory/suppliers', icon: Factory, color: '#7950f2' },
            { title: 'Purchase Orders', desc: 'Create and track POs', href: '/admin/inventory/purchase-orders', icon: Truck, color: '#f08c00' },
            { title: 'Movement History', desc: 'Track all stock changes', href: '/admin/inventory/movements', icon: BarChart3, color: '#2f9e44' },
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

        {/* Low stock table — from API */}
        <motion.div variants={fadeUpVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
              <AlertTriangle size={18} className="inline text-red-400 mr-2" />Low Stock Alert
            </h2>
            <Link href="/admin/inventory/stock?filter=low_stock" className="text-xs font-medium" style={{ color: 'var(--portal-accent)' }}>View All →</Link>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                  {['SKU', 'Product', 'Variant', 'Stock', 'Reserved', 'Available'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--portal-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 w-16 rounded bg-white/10 animate-pulse" /></td>
                    ))}
                  </tr>
                )) : lowStockItems.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--portal-muted)' }}>No low stock items</td></tr>
                ) : lowStockItems.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--portal-border)' }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--portal-muted)' }}>{row.sku}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/inventory/product/${row.productId}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--portal-text)' }}>
                        {row.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--portal-muted)' }}>{[row.color, row.size].filter(Boolean).join(' / ') || '-'}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: row.isOutOfStock ? '#e03131' : '#f08c00' }}>{row.quantity}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--portal-muted)' }}>{row.reserved}</td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: row.available <= 0 ? '#e03131' : 'var(--portal-text)' }}>{row.available}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </PortalShell>
  )
}
