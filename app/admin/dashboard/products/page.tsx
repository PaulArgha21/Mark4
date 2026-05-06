'use client'
import { useState } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Plus, Search, MoreVertical, Edit, Trash2, Eye } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export default function ProductsManagement() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useSWR(`/api/storefront/products?q=${search}`, fetcher)

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Products</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>
              Manage your product catalog
            </p>
          </div>
          <ClayButton variant="primary" size="sm">
            <Plus size={16} /> Add Product
          </ClayButton>
        </motion.div>

        {/* Search */}
        <motion.div variants={fadeUpVariants} className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}
          />
        </motion.div>

        {/* Table */}
        <motion.div
          variants={fadeUpVariants}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                {['Product', 'Brand', 'Price', 'Rating', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--portal-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--portal-elevated)' }} />
                    </td>
                  </tr>
                ))
              ) : (
                data?.items?.map((product: any, i: number) => (
                  <tr
                    key={product.id}
                    style={{ borderBottom: '1px solid var(--portal-border)' }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="40px" />
                        </div>
                        <div>
                          <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--portal-text)' }}>
                            {product.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                            {product.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--portal-text)' }}>
                      {product.brand || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>
                        {formatPrice(product.salePrice || product.basePrice)}
                      </p>
                      {product.salePrice && (
                        <p className="text-xs line-through" style={{ color: 'var(--portal-muted)' }}>
                          {formatPrice(product.basePrice)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--portal-text)' }}>
                      {'★'.repeat(Math.round(product.averageRating))} {product.averageRating}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/10 text-green-400">
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}>
                          <Eye size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}>
                          <Edit size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-white/5 text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </PortalShell>
  )
}
