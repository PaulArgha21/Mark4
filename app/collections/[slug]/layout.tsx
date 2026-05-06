import type { Metadata } from 'next'
import { db } from '@/lib/db'

interface Props {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await db.collection.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true, metaTitle: true, metaDescription: true, bannerUrl: true },
  })

  if (!collection) return { title: 'Collection Not Found — Aprdite' }

  const title = collection.metaTitle ?? `${collection.name} — Aprdite`
  const description = collection.metaDescription ?? collection.description ?? `Shop ${collection.name} at Aprdite.`

  return {
    title,
    description,
    openGraph: {
      title, description,
      images: collection.bannerUrl ? [{ url: collection.bannerUrl }] : [],
      siteName: 'Aprdite',
    },
  }
}

export default function CollectionLayout({ children }: Props) {
  return <>{children}</>
}
