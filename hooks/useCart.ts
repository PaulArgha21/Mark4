'use client'
import useSWR from 'swr'
import type { CartData } from '@/lib/types'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export function useCart() {
  const { data, isLoading, mutate: mutateCart } = useSWR<CartData>('/api/storefront/cart', fetcher)

  const cartCount = data?.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  const addToCart = async (productId: string, variantId: string, quantity: number) => {
    await mutateCart(
      async () => {
        const res = await fetch('/api/storefront/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ variantId, quantity }),
        })
        if (!res.ok) throw new Error('Failed to add to cart')
        return fetch('/api/storefront/cart', { credentials: 'include' }).then(r => r.json()).then(r => r.data)
      },
      { rollbackOnError: true }
    )
  }

  const removeFromCart = async (itemId: string) => {
    await mutateCart(async () => {
      await fetch(`/api/storefront/cart/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      return fetch('/api/storefront/cart', { credentials: 'include' }).then(r => r.json()).then(r => r.data)
    })
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    await mutateCart(async () => {
      await fetch(`/api/storefront/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      })
      return fetch('/api/storefront/cart', { credentials: 'include' }).then(r => r.json()).then(r => r.data)
    })
  }

  return { cart: data, cartCount, isLoading, addToCart, removeFromCart, updateQuantity, mutate: mutateCart }
}
