import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Account — Aprdite',
  description: 'Join Aprdite for exclusive deals, order tracking, and a personalised shopping experience.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
