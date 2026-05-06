'use client'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Trash2, ShoppingBag } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { formatPrice } from '@/lib/utils'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export default function WishlistPage() {
  const { data: items, isLoading, mutate } = useSWR('/api/storefront/wishlist', fetcher)
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)

  const handleRemove = async (id: string) => {
    setRemoving(id)
    try {
      await fetch(`/api/storefront/wishlist/${id}`, {
        method: 'DELETE', credentials: 'include',
      })
      mutate()
      toast.success('Removed from wishlist')
    } catch { toast.error('Failed to remove') }
    finally { setRemoving(null) }
  }

  return (
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 variants={fadeUpVariants} className="font-display text-xl font-bold text-clay-text">
        My Wishlist
      </motion.h2>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="clay-card h-48 animate-shimmer rounded-clay-lg" />)}
        </div>
      ) : !items?.length ? (
        <motion.div variants={fadeUpVariants} className="text-center py-16 clay-card">
          <Heart size={48} className="mx-auto text-clay-text-muted mb-3" strokeWidth={1} />
          <h3 className="font-semibold text-clay-text mb-1">Your wishlist is empty</h3>
          <p className="text-sm text-clay-text-muted">Save items you love and they&apos;ll show up here.</p>
        </motion.div>
      ) : (
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3" variants={staggerContainer}>
          {items.map((item: any) => (
            <motion.div
              key={item.id}
              variants={fadeUpVariants}
              className="clay-card overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                <Link href={`/product/${item.product.slug}`} className="flex-shrink-0">
                  <div className="relative w-20 h-24 rounded-clay-sm overflow-hidden">
                    <Image src={item.product.image} alt={item.product.name} fill className="object-cover" sizes="80px" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    {item.product.brand && (
                      <p className="text-[10px] text-clay-text-muted uppercase tracking-wider">{item.product.brand}</p>
                    )}
                    <Link href={`/product/${item.product.slug}`}>
                      <h3 className="text-sm font-medium text-clay-text line-clamp-2 hover:text-clay-rose transition-colors">
                        {item.product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-clay-text">
                        {formatPrice(item.product.salePrice || item.product.basePrice)}
                      </span>
                      {item.product.salePrice && (
                        <span className="text-xs text-clay-text-muted line-through">
                          {formatPrice(item.product.basePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <ClayButton variant="primary" size="sm" className="flex-1 !text-xs" onClick={() => router.push(`/product/${item.product.slug}`)}>
                      <ShoppingBag size={12} /> Add to Cart
                    </ClayButton>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemove(item.id)}
                      disabled={removing === item.id}
                      className="p-2 text-clay-text-muted hover:text-clay-error transition-colors"
                    >
                      <Trash2 size={14} className={removing === item.id ? 'animate-spin' : ''} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
