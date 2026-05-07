export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { requirePermission } from '@/lib/permissions'
import { ok, badRequest, serverError } from '@/lib/api-response'
import { logAuditEntry } from '@/lib/audit'
import { invalidateCmsCache, CACHE_KEYS } from '@/lib/cache'
import { z } from 'zod'

const rowSchema = z.object({
  name:             z.string().min(1),
  brand:            z.string().optional(),
  category:         z.string().optional(),
  basePrice:        z.coerce.number().min(0),
  salePrice:        z.coerce.number().min(0).optional(),
  costPrice:        z.coerce.number().min(0).optional(),
  description:      z.string().optional(),
  shortDescription: z.string().optional(),
  sku:              z.string().min(1),
  size:             z.string().optional(),
  color:            z.string().optional(),
  colorHex:         z.string().optional(),
  stock:            z.coerce.number().int().min(0).default(0),
  weight:           z.coerce.number().optional(),
  isFeatured:       z.preprocess(v => v === 'true' || v === true, z.boolean().default(false)),
})

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function POST(request: Request) {
  const { error, employee } = await requirePermission(request, 'products.create')
  if (error) return error

  try {
    const body = await request.json()
    const { products: rawProducts } = body

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return badRequest('No products provided')
    }
    if (rawProducts.length > 500) {
      return badRequest('Maximum 500 products per upload')
    }

    // Group rows by product name (multiple rows with same name = multiple variants)
    const productGroups = new Map<string, any[]>()
    for (const row of rawProducts) {
      const name = row.name?.toString()?.trim()
      if (!name) continue
      if (!productGroups.has(name)) productGroups.set(name, [])
      productGroups.get(name)!.push(row)
    }

    // Fetch categories for mapping by name
    const categories = await db.category.findMany({ select: { id: true, name: true } })
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))

    let success = 0
    let failed = 0
    const errors: { row: number; message: string }[] = []
    let rowIndex = 1

    for (const [productName, rows] of Array.from(productGroups)) {
      const firstRow = rows[0]
      const firstRowIdx = rowIndex
      rowIndex += rows.length

      try {
        // Validate first row for product-level fields
        const parsed = rowSchema.safeParse(firstRow)
        if (!parsed.success) {
          failed++
          errors.push({ row: firstRowIdx, message: `Validation failed: ${parsed.error.issues.map(i => i.message).join(', ')}` })
          continue
        }

        const data = parsed.data

        // Resolve category
        const categoryId = data.category
          ? categoryMap.get(data.category.toLowerCase()) || null
          : null

        // Generate slug
        let slug = slugify(productName)
        const existing = await db.product.findUnique({ where: { slug } })
        if (existing) slug = `${slug}-${Date.now().toString(36)}`

        // Validate all variant rows
        const variantData: { sku: string; name?: string; size?: string; color?: string; colorHex?: string; priceDelta: number; weight?: number; stock: number }[] = []
        let variantError = false

        for (let i = 0; i < rows.length; i++) {
          const vParsed = rowSchema.safeParse(rows[i])
          if (!vParsed.success) {
            errors.push({ row: firstRowIdx + i, message: `Variant validation failed: ${vParsed.error.issues[0].message}` })
            variantError = true
            break
          }
          const v = vParsed.data
          variantData.push({
            sku: v.sku,
            name: [v.size, v.color].filter(Boolean).join(' / ') || undefined,
            size: v.size || undefined,
            color: v.color || undefined,
            colorHex: v.colorHex || undefined,
            priceDelta: 0,
            weight: v.weight,
            stock: v.stock,
          })
        }

        if (variantError) { failed++; continue }

        // Check for duplicate SKUs
        const skus = variantData.map(v => v.sku)
        const existingSkus = await db.productVariant.findMany({
          where: { sku: { in: skus } },
          select: { sku: true },
        })
        if (existingSkus.length > 0) {
          failed++
          errors.push({ row: firstRowIdx, message: `Duplicate SKU(s): ${existingSkus.map(s => s.sku).join(', ')}` })
          continue
        }

        // Create product + variants in transaction
        await db.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              name: productName,
              slug,
              description: data.description,
              shortDescription: data.shortDescription,
              brand: data.brand,
              categoryId,
              basePrice: data.basePrice,
              salePrice: data.salePrice,
              costPrice: data.costPrice,
              isFeatured: data.isFeatured,
            },
          })

          for (let i = 0; i < variantData.length; i++) {
            const vd = variantData[i]
            const variant = await tx.productVariant.create({
              data: {
                productId: product.id,
                sku: vd.sku,
                name: vd.name,
                size: vd.size,
                color: vd.color,
                colorHex: vd.colorHex,
                priceDelta: vd.priceDelta,
                weight: vd.weight,
                sortOrder: i,
              },
            })
            await tx.inventory.create({
              data: { variantId: variant.id, quantity: vd.stock },
            })
          }
        })

        success++
      } catch (err: any) {
        failed++
        errors.push({ row: firstRowIdx, message: err.message || 'Unknown error' })
      }
    }

    // Audit
    logAuditEntry({
      employeeId: employee!.id,
      role: employee!.role,
      action: 'product.bulk_created',
      resourceType: 'Product',
      resourceId: 'bulk',
      payload: { context: { success, failed, totalRows: rawProducts.length } },
    })

    // Invalidate caches
    if (success > 0) {
      await invalidateCmsCache([
        { key: CACHE_KEYS.homepage, revalidatePaths: ['/'], broadcastEvent: 'products-bulk-created' },
      ])
    }

    return ok({ success, failed, errors: errors.slice(0, 50) })
  } catch (err) {
    console.error('Bulk upload error:', err)
    return serverError()
  }
}
