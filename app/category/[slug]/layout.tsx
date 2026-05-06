import type { Metadata } from 'next'
import { db } from '@/lib/db'

interface Props {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await db.category.findFirst({
    where: { slug: params.slug },
    select: { name: true, description: true, image: true },
  })

  if (!category) return { title: 'Category Not Found — Aprdite' }

  const title = `${category.name} — Aprdite`
  const description = category.description ?? `Shop ${category.name} at Aprdite. Discover the latest styles and trends.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: category.image ? [{ url: category.image, width: 1200, height: 630 }] : [],
      type: 'website',
      siteName: 'Aprdite',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function CategoryLayout({ children }: Props) {
  return <>{children}</>
}
