import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shopping Cart — Aprdite',
  description: 'Review your shopping cart and proceed to checkout at Aprdite.',
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
