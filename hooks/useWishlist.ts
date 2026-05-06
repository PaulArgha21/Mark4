'use client'
import useSWR from 'swr'
import { useAuth } from './useAuth'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) return []
    return r.json().then(d => d.data)
  })

export function useWishlist() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const { data: wishlistedIds = [], mutate } = useSWR<string[]>(
    isAuthenticated ? '/api/storefront/wishlist/ids' : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const isWishlisted = useCallback(
    (productId: string) => wishlistedIds.includes(productId),
    [wishlistedIds]
  )

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        toast.error('Please sign in to save items', {
          action: { label: 'Sign In', onClick: () => router.push('/login') },
        })
        return false
      }

      // Optimistic update
      const wasWishlisted = wishlistedIds.includes(productId)
      const optimistic = wasWishlisted
        ? wishlistedIds.filter(id => id !== productId)
        : [...wishlistedIds, productId]

      mutate(optimistic, false)

      try {
        const res = await fetch('/api/storefront/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || 'Failed')

        toast.success(data.data.wishlisted ? 'Added to wishlist' : 'Removed from wishlist')
        mutate()
        return data.data.wishlisted
      } catch {
        // Revert optimistic update
        mutate(wishlistedIds, false)
        toast.error('Failed to update wishlist')
        return wasWishlisted
      }
    },
    [isAuthenticated, wishlistedIds, mutate, router]
  )

  return { wishlistedIds, isWishlisted, toggleWishlist, mutate }
}
