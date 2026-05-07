'use client'
import { useState, useCallback } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search, Edit, Trash2, Eye, FileSpreadsheet, ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export default function ProductsManagement() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sort, setSort] = useState<string>('newest')

  const queryStr = new URLSearchParams({
    page: String(page),
    limit: '20',
    ...(search && { search }),
    status,
    sort,
  }).toString()

  const { data, isLoading, mutate } = useSWR(`/api/portal/products?${queryStr}`, fetcher)

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate "${name}"? This will hide it from the storefront.`)) return
    try {
      const res = await fetch(`/api/portal/products/${id}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) {
        toast.success('Product deactivated')
        mutate()
      } else {
        const err = await res.json()
        toast.error(err.message || 'Failed to delete')
      }
    } catch {
      toast.error('Failed to delete product')
    }
  }, [mutate])

  const handleToggleActive = useCallback(async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/portal/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (res.ok) {
        toast.success(currentActive ? 'Product deactivated' : 'Product activated')
        mutate()
      }
    } catch {
      toast.error('Failed to update status')
    }
  }, [mutate])

  const pagination = data?.pagination

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        {/* Header */}
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Products</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>
              {pagination ? `${pagination.total} products` : 'Manage your product catalog'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/dashboard/products/bulk">
              <ClayButton variant="ghost" size="sm">
                <FileSpreadsheet size={16} /> Bulk Upload
              </ClayButton>
            </Link>
            <Link href="/admin/dashboard/products/add">
              <ClayButton variant="primary" size="sm">
                <Plus size={16} /> Add Product
              </ClayButton>
            </Link>
          </div>
        </motion.div>

        {/* Filters Row */}
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--portal-muted)' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name, brand, or SKU..."
              className="portal-input pl-10"
            />
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value as any); setPage(1) }}
            className="portal-input-sm w-auto"
            style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={sort}
            onChange={e => { setSort(e.target.value); setPage(1) }}
            className="portal-input-sm w-auto"
            style={{ width: 'auto', padding: '0.5rem 0.75rem' }}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name A-Z</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
        </motion.div>

        {/* Table */}
        <motion.div
          variants={fadeUpVariants}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
        >
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--portal-elevated)' }} />
              ))}
            </div>
          ) : !data?.items?.length ? (
            <div className="p-12 text-center">
              <Package size={40} className="mx-auto mb-3" style={{ color: 'var(--portal-muted)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>No products found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>
                {search ? 'Try a different search term' : 'Add your first product to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--portal-border)' }}>
                    {['Product', 'Category', 'Price', 'Variants', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--portal-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((product: any) => (
                    <tr
                      key={product.id}
                      style={{ borderBottom: '1px solid var(--portal-border)' }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--portal-elevated)' }}>
                            {product.image ? (
                              <Image src={product.image} alt={product.name} fill className="object-cover" sizes="40px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={16} style={{ color: 'var(--portal-muted)' }} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--portal-text)' }}>
                              {product.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                              {product.brand || product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-text)' }}>
                        {product.category?.name || '—'}
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
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--portal-muted)' }}>
                        {product.variantCount} variant{product.variantCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(product.id, product.isActive)}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                            product.isActive
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/product/${product.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}>
                            <Eye size={14} />
                          </Link>
                          <Link href={`/admin/dashboard/products/${product.id}/edit`} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}>
                            <Edit size={14} />
                          </Link>
                          <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 rounded-lg hover:bg-white/5 text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--portal-border)' }}>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
                  style={{ color: 'var(--portal-muted)' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  disabled={!pagination.hasMore}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30"
                  style={{ color: 'var(--portal-muted)' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </PortalShell>
  )
}
