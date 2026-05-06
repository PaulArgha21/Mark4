import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search — Aprdite',
  description: 'Search for products across the Aprdite catalogue. Find exactly what you are looking for.',
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
