/**
 * Shipping & Delivery Estimation Engine
 *
 * Industry-standard algorithm:
 * 1. Resolve destination pincode → zone (Metro/Tier1/Tier2/Tier3/Rural/Remote)
 * 2. Find warehouses that have the product in stock
 * 3. Resolve each warehouse pincode → origin zone
 * 4. Look up ShippingPolicy for origin→destination zone pair
 * 5. Pick the warehouse with shortest transit time
 * 6. Add processing time (1 day) + buffer
 * 7. Return min-max day estimate + cost
 */

import { db } from '@/lib/db'

// ── Indian pincode → zone mapping by prefix ──────────────────
// Real logistics companies (Delhivery, BlueDart, Ecom Express)
// classify India's 19,000+ pincodes into zones:
//
// METRO:  Top 8 cities (Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad)
// TIER1:  State capitals & major cities (pop > 10L)
// TIER2:  District HQs & mid-sized cities (pop 3-10L)
// TIER3:  Small towns (pop 1-3L)
// RURAL:  Villages & remote towns
// REMOTE: North-East, J&K, Ladakh, Andaman, Lakshadweep

export const METRO_PINCODE_PREFIXES = [
  // Mumbai region
  '400', '410', '411',
  // Delhi NCR
  '110', '120', '121', '122', '201', '202',
  // Bangalore
  '560', '561', '562',
  // Hyderabad
  '500', '501',
  // Chennai
  '600', '601', '602', '603',
  // Kolkata
  '700', '711', '712',
  // Pune
  '411', '412',
  // Ahmedabad
  '380', '382', '383',
]

export const TIER1_PREFIXES = [
  // Jaipur
  '302', '303',
  // Lucknow
  '226', '227',
  // Chandigarh
  '160',
  // Indore
  '452', '453',
  // Bhopal
  '462',
  // Patna
  '800', '801',
  // Kochi
  '682', '683',
  // Coimbatore
  '641', '642',
  // Nagpur
  '440', '441',
  // Visakhapatnam
  '530',
  // Surat
  '395',
  // Vadodara
  '390',
  // Thiruvananthapuram
  '695',
]

export const REMOTE_STATE_PREFIXES = [
  // J&K / Ladakh
  '180', '181', '182', '184', '185', '190', '191', '192', '193', '194',
  // North-East (Assam, Manipur, Meghalaya, Mizoram, Nagaland, Tripura, Arunachal, Sikkim)
  '781', '782', '783', '784', '785', '786', '787', '788', '790', '791', '792', '793', '794', '795', '796',
  // Andaman & Nicobar
  '744',
  // Lakshadweep
  '682559', // special case
]

export interface DeliveryEstimate {
  isServiceable: boolean
  isCODAvailable: boolean
  minDays: number
  maxDays: number
  deliveryDateMin: string   // ISO date
  deliveryDateMax: string   // ISO date
  shippingCost: number
  freeShippingAbove: number | null
  isExpressAvailable: boolean
  expressMinDays?: number
  expressMaxDays?: number
  expressCost?: number
  warehouseCity?: string
  warehouseState?: string
  zoneName: string
  deliveryNote?: string
}

/**
 * Estimate delivery for a product variant to a destination pincode.
 * This follows the same logic as Flipkart/Myntra/Amazon India:
 *
 * 1. Check if pincode is serviceable
 * 2. Find inventory across warehouses
 * 3. Calculate transit time per warehouse → destination zone
 * 4. Return best (fastest) option
 */
export async function estimateDelivery(
  destinationPincode: string,
  variantId?: string,
): Promise<DeliveryEstimate> {
  // 1. Resolve destination pincode
  const destEntry = await db.pincodeEntry.findUnique({
    where: { pincode: destinationPincode },
    include: { zone: true },
  })

  // If pincode not in directory, infer zone from prefix
  const destZone = destEntry?.zone ?? await inferZoneFromPrefix(destinationPincode)

  if (!destEntry?.isServiceable && destEntry !== null) {
    return {
      isServiceable: false,
      isCODAvailable: false,
      minDays: 0,
      maxDays: 0,
      deliveryDateMin: '',
      deliveryDateMax: '',
      shippingCost: 0,
      freeShippingAbove: null,
      isExpressAvailable: false,
      zoneName: destZone?.name ?? 'Unknown',
      deliveryNote: 'This pincode is currently not serviceable.',
    }
  }

  // 2. Find warehouses with stock (if variantId provided)
  let warehouses = await db.warehouseLocation.findMany({
    where: { isActive: true, pincode: { not: null } },
  })

  if (variantId) {
    // Find which warehouses have this variant in stock
    const inventoryRecords = await db.inventory.findMany({
      where: {
        variantId,
        quantity: { gt: 0 },
        warehouseId: { not: null },
      },
    })
    const warehouseIdsWithStock = new Set(inventoryRecords.map(i => i.warehouseId))
    const filteredWarehouses = warehouses.filter(w => warehouseIdsWithStock.has(w.id))

    // If no warehouse-level stock, use all warehouses (centralized inventory)
    if (filteredWarehouses.length > 0) {
      warehouses = filteredWarehouses
    }
  }

  // If no warehouses configured, return default estimate
  if (warehouses.length === 0) {
    return getDefaultEstimate(destZone, destEntry)
  }

  // 3. For each warehouse, calculate transit time
  let bestEstimate: {
    policy: Awaited<ReturnType<typeof getShippingPolicy>>
    warehouse: typeof warehouses[0]
    originZone: Awaited<ReturnType<typeof inferZoneFromPrefix>>
  } | null = null

  for (const warehouse of warehouses) {
    if (!warehouse.pincode) continue

    const originZone = await resolveZone(warehouse.pincode)
    if (!originZone || !destZone) continue

    const policy = await getShippingPolicy(originZone.id, destZone.id)
    if (!policy) continue

    if (!bestEstimate || policy.minDays < bestEstimate.policy!.minDays) {
      bestEstimate = { policy, warehouse, originZone }
    }
  }

  if (!bestEstimate?.policy) {
    return getDefaultEstimate(destZone, destEntry)
  }

  const { policy, warehouse } = bestEstimate
  const processingDays = 1 // Standard 1-day processing

  const minDays = policy.minDays + processingDays
  const maxDays = policy.maxDays + processingDays

  const now = new Date()
  const minDate = addBusinessDays(now, minDays)
  const maxDate = addBusinessDays(now, maxDays)

  return {
    isServiceable: true,
    isCODAvailable: destEntry?.isCODAvailable ?? true,
    minDays,
    maxDays,
    deliveryDateMin: minDate.toISOString(),
    deliveryDateMax: maxDate.toISOString(),
    shippingCost: policy.baseCost,
    freeShippingAbove: policy.freeShippingAbove,
    isExpressAvailable: policy.isExpressAvailable,
    expressMinDays: policy.expressMinDays ? policy.expressMinDays + processingDays : undefined,
    expressMaxDays: policy.expressMaxDays ? policy.expressMaxDays + processingDays : undefined,
    expressCost: policy.expressCost ?? undefined,
    warehouseCity: warehouse.city ?? undefined,
    warehouseState: warehouse.state ?? undefined,
    zoneName: destZone?.name ?? 'Standard',
    deliveryNote: destEntry?.deliveryNote ?? undefined,
  }
}

// ── Helper: Resolve pincode to zone ──────────────────────────
async function resolveZone(pincode: string) {
  const entry = await db.pincodeEntry.findUnique({
    where: { pincode },
    include: { zone: true },
  })
  if (entry) return entry.zone
  return inferZoneFromPrefix(pincode)
}

// ── Helper: Infer zone from pincode prefix ───────────────────
async function inferZoneFromPrefix(pincode: string) {
  const prefix3 = pincode.slice(0, 3)

  let type: 'METRO' | 'TIER1' | 'TIER2' | 'TIER3' | 'RURAL' | 'REMOTE' = 'TIER3'

  if (METRO_PINCODE_PREFIXES.includes(prefix3)) type = 'METRO'
  else if (TIER1_PREFIXES.includes(prefix3)) type = 'TIER1'
  else if (REMOTE_STATE_PREFIXES.includes(prefix3)) type = 'REMOTE'
  else {
    // Use first digit to approximate tier
    const firstDigit = parseInt(pincode[0])
    if ([1, 2, 3, 4, 5, 6, 7].includes(firstDigit)) type = 'TIER2'
    else type = 'TIER3'
  }

  // Find or create zone
  const zone = await db.shippingZone.findFirst({ where: { type } })
  return zone
}

// ── Helper: Get shipping policy for origin→dest zones ────────
async function getShippingPolicy(originZoneId: string, destZoneId: string) {
  return db.shippingPolicy.findUnique({
    where: {
      originZoneId_destinationZoneId: {
        originZoneId,
        destinationZoneId: destZoneId,
      },
    },
  })
}

// ── Helper: Default estimate when no policy exists ───────────
function getDefaultEstimate(
  zone: { name: string; type: string } | null,
  entry: { isServiceable: boolean; isCODAvailable: boolean; deliveryNote?: string | null } | null,
): DeliveryEstimate {
  // Industry defaults by zone type
  const defaults: Record<string, { min: number; max: number; cost: number }> = {
    METRO:  { min: 2, max: 4, cost: 0 },
    TIER1:  { min: 3, max: 5, cost: 40 },
    TIER2:  { min: 4, max: 7, cost: 50 },
    TIER3:  { min: 5, max: 8, cost: 60 },
    RURAL:  { min: 6, max: 10, cost: 70 },
    REMOTE: { min: 7, max: 14, cost: 99 },
  }

  const d = defaults[zone?.type ?? 'TIER2'] ?? defaults.TIER2

  const now = new Date()
  return {
    isServiceable: entry?.isServiceable ?? true,
    isCODAvailable: entry?.isCODAvailable ?? true,
    minDays: d.min,
    maxDays: d.max,
    deliveryDateMin: addBusinessDays(now, d.min).toISOString(),
    deliveryDateMax: addBusinessDays(now, d.max).toISOString(),
    shippingCost: d.cost,
    freeShippingAbove: 499,
    isExpressAvailable: zone?.type === 'METRO' || zone?.type === 'TIER1',
    zoneName: zone?.name ?? 'Standard',
    deliveryNote: entry?.deliveryNote ?? undefined,
  }
}

// ── Helper: Add business days (skip Sundays) ─────────────────
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    // Skip Sundays (day 0)
    if (result.getDay() !== 0) added++
  }
  return result
}

// ── Helper: Format date for display ──────────────────────────
export function formatDeliveryDate(isoDate: string): string {
  const d = new Date(isoDate)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}
