import type { Metadata } from 'next'
import { db } from '@/lib/db'

interface Props {
  params: { slug: string }
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      metaTitle: true,
      metaDescription: true,
      description: true,
      brand: true,
      basePrice: true,
      salePrice: true,
      media: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  })

  if (!product) return { title: 'Product Not Found — Aprdite' }

  const title = product.metaTitle ?? `${product.name} — Aprdite`
  const description =
    product.metaDescription ??
    product.description?.slice(0, 160) ??
    `Shop ${product.name} by ${product.brand ?? 'Aprdite'}. Premium fashion at the best prices.`
  const image = product.media[0]?.url

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, width: 800, height: 1000 }] : [],
      type: 'website',
      siteName: 'Aprdite',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : [],
    },
  }
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>
}
