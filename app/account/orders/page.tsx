'use client'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Package, ChevronRight } from 'lucide-react'
import { ClayBadge } from '@/components/ui/ClayBadge'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

const statusColors: Record<string, string> = {
  PENDING: 'default',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'sale',
  RETURNED: 'default',
}

export default function OrdersPage() {
  const { data, isLoading } = useSWR('/api/storefront/orders', fetcher)

  return (
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 variants={fadeUpVariants} className="font-display text-xl font-bold text-clay-text">
        My Orders
      </motion.h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="clay-card h-36 animate-shimmer rounded-clay-lg" />)}
        </div>
      ) : !data?.items?.length ? (
        <motion.div variants={fadeUpVariants} className="text-center py-16 clay-card">
          <Package size={48} className="mx-auto text-clay-text-muted mb-3" strokeWidth={1} />
          <h3 className="font-semibold text-clay-text mb-1">No orders yet</h3>
          <p className="text-sm text-clay-text-muted">Your orders will appear here once you make a purchase.</p>
        </motion.div>
      ) : (
        data.items.map((order: { id: string; orderNumber: string; createdAt: string; total: number; status: string; items: { id: string; image: string; productName: string; variantInfo: string; quantity: number; price: number }[] }) => (
          <Link key={order.id} href={`/account/orders/${order.id}`}>
          <motion.div variants={fadeUpVariants} className="clay-card overflow-hidden">
            {/* Order header */}
            <div className="flex items-center justify-between p-4 bg-clay-bg-sunken border-b border-clay-divider">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-clay-text-muted">Order</p>
                  <p className="text-sm font-semibold text-clay-text">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-clay-text-muted">Placed on</p>
                  <p className="text-sm text-clay-text">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-clay-text-muted">Total</p>
                  <p className="text-sm font-bold text-clay-text">{formatPrice(order.total)}</p>
                </div>
              </div>
              <ClayBadge variant={(statusColors[order.status] || 'default') as 'default' | 'info' | 'success' | 'sale'} size="sm">
                {order.status}
              </ClayBadge>
            </div>

            {/* Order items */}
            <div className="p-4 space-y-3">
              {order.items.map((item: { id: string; image: string; productName: string; variantInfo: string; quantity: number; price: number }) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="relative w-14 h-18 rounded-clay-sm overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image src={item.image} alt={item.productName} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="w-full h-full bg-clay-bg-sunken flex items-center justify-center">
                        <Package size={20} className="text-clay-text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-clay-text line-clamp-1">{item.productName}</p>
                    <p className="text-xs text-clay-text-muted">{item.variantInfo} • Qty: {item.quantity}</p>
                    <p className="text-sm font-semibold text-clay-text">{formatPrice(item.price)}</p>
                  </div>
                  <ChevronRight size={16} className="text-clay-text-muted" />
                </div>
              ))}
            </div>
          </motion.div>
          </Link>
        ))
      )}
    </motion.div>
  )
}
