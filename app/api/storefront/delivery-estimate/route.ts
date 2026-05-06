export const runtime = 'nodejs'

import { ok, badRequest, serverError } from '@/lib/api-response'
import { estimateDelivery } from '@/lib/shipping'

// GET /api/storefront/delivery-estimate?pincode=400001&variantId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pincode = searchParams.get('pincode')
    const variantId = searchParams.get('variantId') || undefined

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return badRequest('Valid 6-digit pincode is required')
    }

    const estimate = await estimateDelivery(pincode, variantId)
    return ok(estimate)
  } catch (err) {
    console.error('Delivery estimate error:', err)
    return serverError()
  }
}
