import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Employee Portal — Aprdite',
  description: 'Aprdite employee administration portal.',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
