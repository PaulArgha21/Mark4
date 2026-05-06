import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Checkout — Aprdite',
  description: 'Complete your order securely at Aprdite.',
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
