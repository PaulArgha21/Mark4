import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding products...')

  // Create categories
  const categories = await Promise.all([
    db.category.upsert({
      where: { slug: 'dresses' },
      update: {},
      create: {
        name: 'Dresses',
        slug: 'dresses',
        description: 'Beautiful dresses for every occasion',
        sortOrder: 1,
        isActive: true,
      },
    }),
    db.category.upsert({
      where: { slug: 'tops' },
      update: {},
      create: {
        name: 'Tops',
        slug: 'tops',
        description: 'Stylish tops and blouses',
        sortOrder: 2,
        isActive: true,
      },
    }),
    db.category.upsert({
      where: { slug: 'bottoms' },
      update: {},
      create: {
        name: 'Bottoms',
        slug: 'bottoms',
        description: 'Comfortable pants, skirts, and shorts',
        sortOrder: 3,
        isActive: true,
      },
    }),
    db.category.upsert({
      where: { slug: 'ethnic-wear' },
      update: {},
      create: {
        name: 'Ethnic Wear',
        slug: 'ethnic-wear',
        description: 'Traditional Indian wear',
        sortOrder: 4,
        isActive: true,
      },
    }),
  ])

  const categoryMap = Object.fromEntries(categories.map(c => [c.slug, c.id]))

  // Create tags
  const tags = await Promise.all([
    db.tag.upsert({ where: { slug: 'new-arrival' }, update: {}, create: { name: 'New Arrival', slug: 'new-arrival' } }),
    db.tag.upsert({ where: { slug: 'bestseller' }, update: {}, create: { name: 'Bestseller', slug: 'bestseller' } }),
    db.tag.upsert({ where: { slug: 'summer' }, update: {}, create: { name: 'Summer', slug: 'summer' } }),
    db.tag.upsert({ where: { slug: 'party' }, update: {}, create: { name: 'Party', slug: 'party' } }),
    db.tag.upsert({ where: { slug: 'casual' }, update: {}, create: { name: 'Casual', slug: 'casual' } }),
  ])

  const tagMap = Object.fromEntries(tags.map(t => [t.name, t.id]))

  // Product data
  const products = [
    {
      name: 'Floral Maxi Dress',
      slug: 'floral-maxi-dress',
      description: 'A beautiful floral print maxi dress perfect for summer outings. Features a flowy silhouette with a flattering V-neckline.',
      shortDescription: 'Floral print maxi dress with V-neck',
      brand: 'Aprdite',
      categoryId: categoryMap['dresses'],
      basePrice: 2499,
      salePrice: 1999,
      currency: 'INR',
      isFeatured: true,
      variants: [
        { sku: 'FMD-S-M', size: 'S', color: 'Floral', colorHex: '#FFB6C1', priceDelta: 0, quantity: 20 },
        { sku: 'FMD-M-M', size: 'M', color: 'Floral', colorHex: '#FFB6C1', priceDelta: 0, quantity: 25 },
        { sku: 'FMD-L-M', size: 'L', color: 'Floral', colorHex: '#FFB6C1', priceDelta: 0, quantity: 15 },
      ],
      tags: ['New Arrival', 'Summer'],
    },
    {
      name: 'Embroidered Kurti Set',
      slug: 'embroidered-kurti-set',
      description: 'Elegant embroidered kurti with matching palazzo pants. Perfect for festive occasions.',
      shortDescription: 'Embroidered kurti with palazzo pants',
      brand: 'Aprdite',
      categoryId: categoryMap['ethnic-wear'],
      basePrice: 3499,
      currency: 'INR',
      isFeatured: true,
      variants: [
        { sku: 'EKS-S-M', size: 'S', color: 'Maroon', colorHex: '#800000', priceDelta: 0, quantity: 15 },
        { sku: 'EKS-M-M', size: 'M', color: 'Maroon', colorHex: '#800000', priceDelta: 0, quantity: 20 },
        { sku: 'EKS-L-M', size: 'L', color: 'Maroon', colorHex: '#800000', priceDelta: 0, quantity: 10 },
      ],
      tags: ['Bestseller', 'Party'],
    },
    {
      name: 'Cropped Denim Jacket',
      slug: 'cropped-denim-jacket',
      description: 'Trendy cropped denim jacket with classic button closure. Layer it over any outfit for a stylish look.',
      shortDescription: 'Cropped denim jacket',
      brand: 'Aprdite',
      categoryId: categoryMap['tops'],
      basePrice: 2999,
      currency: 'INR',
      variants: [
        { sku: 'CDJ-S-BL', size: 'S', color: 'Blue', colorHex: '#1E90FF', priceDelta: 0, quantity: 18 },
        { sku: 'CDJ-M-BL', size: 'M', color: 'Blue', colorHex: '#1E90FF', priceDelta: 0, quantity: 22 },
        { sku: 'CDJ-L-BL', size: 'L', color: 'Blue', colorHex: '#1E90FF', priceDelta: 0, quantity: 12 },
      ],
      tags: ['Casual', 'Bestseller'],
    },
    {
      name: 'High-Waist Wide Leg Pants',
      slug: 'high-waist-wide-leg-pants',
      description: 'Comfortable high-waist wide leg pants in soft fabric. Perfect for everyday wear.',
      shortDescription: 'High-waist wide leg pants',
      brand: 'Aprdite',
      categoryId: categoryMap['bottoms'],
      basePrice: 1799,
      salePrice: 1499,
      currency: 'INR',
      variants: [
        { sku: 'HWLP-S-BK', size: 'S', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 25 },
        { sku: 'HWLP-M-BK', size: 'M', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 30 },
        { sku: 'HWLP-L-BK', size: 'L', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 20 },
        { sku: 'HWLP-S-GR', size: 'S', color: 'Gray', colorHex: '#808080', priceDelta: 0, quantity: 15 },
        { sku: 'HWLP-M-GR', size: 'M', color: 'Gray', colorHex: '#808080', priceDelta: 0, quantity: 18 },
      ],
      tags: ['Casual', 'New Arrival'],
    },
    {
      name: 'Silk Saree with Blouse',
      slug: 'silk-saree-with-blouse',
      description: 'Elegant silk saree with matching blouse piece. Traditional craftsmanship meets modern elegance.',
      shortDescription: 'Silk saree with blouse',
      brand: 'Aprdite',
      categoryId: categoryMap['ethnic-wear'],
      basePrice: 5999,
      currency: 'INR',
      isFeatured: true,
      variants: [
        { sku: 'SSWB-OS-RD', size: 'OS', color: 'Red', colorHex: '#DC143C', priceDelta: 0, quantity: 10 },
        { sku: 'SSWB-OS-GD', size: 'OS', color: 'Gold', colorHex: '#FFD700', priceDelta: 0, quantity: 8 },
      ],
      tags: ['Party', 'Bestseller'],
    },
    {
      name: 'Puff Sleeve Blouse',
      slug: 'puff-sleeve-blouse',
      description: 'Chic puff sleeve blouse in soft cotton. Perfect for office or casual outings.',
      shortDescription: 'Puff sleeve cotton blouse',
      brand: 'Aprdite',
      categoryId: categoryMap['tops'],
      basePrice: 1299,
      currency: 'INR',
      variants: [
        { sku: 'PSB-S-WH', size: 'S', color: 'White', colorHex: '#FFFFFF', priceDelta: 0, quantity: 20 },
        { sku: 'PSB-M-WH', size: 'M', color: 'White', colorHex: '#FFFFFF', priceDelta: 0, quantity: 25 },
        { sku: 'PSB-L-WH', size: 'L', color: 'White', colorHex: '#FFFFFF', priceDelta: 0, quantity: 15 },
        { sku: 'PSB-S-BL', size: 'S', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 18 },
        { sku: 'PSB-M-BL', size: 'M', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 22 },
      ],
      tags: ['Casual', 'New Arrival'],
    },
    {
      name: 'A-Line Midi Skirt',
      slug: 'a-line-midi-skirt',
      description: 'Flattering A-line midi skirt with elastic waistband. Available in multiple colors.',
      shortDescription: 'A-line midi skirt',
      brand: 'Aprdite',
      categoryId: categoryMap['bottoms'],
      basePrice: 1499,
      currency: 'INR',
      variants: [
        { sku: 'ALMS-S-BK', size: 'S', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 22 },
        { sku: 'ALMS-M-BK', size: 'M', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 28 },
        { sku: 'ALMS-L-BK', size: 'L', color: 'Black', colorHex: '#000000', priceDelta: 0, quantity: 18 },
        { sku: 'ALMS-S-NV', size: 'S', color: 'Navy', colorHex: '#000080', priceDelta: 0, quantity: 15 },
        { sku: 'ALMS-M-NV', size: 'M', color: 'Navy', colorHex: '#000080', priceDelta: 0, quantity: 20 },
      ],
      tags: ['Casual', 'Summer'],
    },
    {
      name: 'Wrap Dress with Belt',
      slug: 'wrap-dress-with-belt',
      description: 'Elegant wrap dress with self-tie belt. Flattering for all body types.',
      shortDescription: 'Wrap dress with belt',
      brand: 'Aprdite',
      categoryId: categoryMap['dresses'],
      basePrice: 2799,
      salePrice: 2299,
      currency: 'INR',
      isFeatured: true,
      variants: [
        { sku: 'WDB-S-GR', size: 'S', color: 'Green', colorHex: '#228B22', priceDelta: 0, quantity: 15 },
        { sku: 'WDB-M-GR', size: 'M', color: 'Green', colorHex: '#228B22', priceDelta: 0, quantity: 20 },
        { sku: 'WDB-L-GR', size: 'L', color: 'Green', colorHex: '#228B22', priceDelta: 0, quantity: 12 },
        { sku: 'WDB-S-RD', size: 'S', color: 'Red', colorHex: '#DC143C', priceDelta: 0, quantity: 12 },
        { sku: 'WDB-M-RD', size: 'M', color: 'Red', colorHex: '#DC143C', priceDelta: 0, quantity: 15 },
      ],
      tags: ['Party', 'Bestseller'],
    },
  ]

  for (const productData of products) {
    const { variants, tags: productTags, ...productFields } = productData

    const product = await db.product.upsert({
      where: { slug: productFields.slug },
      update: productFields,
      create: productFields,
    })

    // Create variants
    for (const variantData of variants) {
      const { quantity, ...variantFields } = variantData
      const variant = await db.productVariant.upsert({
        where: { sku: variantData.sku },
        update: { ...variantFields, productId: product.id },
        create: { ...variantFields, productId: product.id },
      })

      // Create inventory (using composite unique with null warehouseId)
      const existingInv = await db.inventory.findFirst({ where: { variantId: variant.id } })
      if (existingInv) {
        await db.inventory.update({ where: { id: existingInv.id }, data: { quantity } })
      } else {
        await db.inventory.create({ data: { variantId: variant.id, quantity } })
      }
    }

    // Connect tags
    for (const tagName of productTags) {
      const tagId = tagMap[tagName]
      if (tagId) {
        await db.productTag.upsert({
          where: {
            productId_tagId: { productId: product.id, tagId },
          },
          update: {},
          create: { productId: product.id, tagId },
        })
      }
    }

    console.log(`  ✓ Created: ${product.name}`)
  }

  console.log('✅ Product seeding complete!')
}

main().catch(console.error).finally(() => db.$disconnect())
