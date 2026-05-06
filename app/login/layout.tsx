import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — Aprdite',
  description: 'Sign in to your Aprdite account to manage orders, wishlist, and more.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
