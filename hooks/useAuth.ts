'use client'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'

const fetcher = async (url: string) => {
  let res = await fetch(url, { credentials: 'include' })
  
  // If 401, try refreshing the token silently
  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (refreshRes.ok) {
      // Retry original request with new token
      res = await fetch(url, { credentials: 'include' })
    }
  }
  
  if (!res.ok) throw new Error('Not authenticated')
  return res.json().then(r => r.data)
}

export function useAuth() {
  const router = useRouter()
  const { data: user, error, isLoading, mutate } = useSWR<User>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const login = async (identifier: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Login failed')
    await mutate()
    return data
  }

  const register = async (name: string, email: string, phone: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, phone, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'Registration failed')
    await mutate()
    return data
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    await mutate(undefined, { revalidate: false })
    router.push('/')
    router.refresh()
  }

  return {
    user,
    isAuthenticated: !!user && !error,
    isLoading,
    login,
    register,
    logout,
    mutate,
  }
}
