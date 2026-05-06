export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { ok, serverError } from '@/lib/api-response'
import { requirePermission } from '@/lib/permissions'

// POST /api/portal/shipping/seed — Seed default zones & policies
export async function POST(request: Request) {
  try {
    const { error } = await requirePermission(request, 'settings.manage')
    if (error) return error

    // ── 1. Create shipping zones ─────────────────────────
    const zoneData = [
      { name: 'Metro',           type: 'METRO'  as const, description: 'Top 8 metro cities — Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad' },
      { name: 'Tier 1',          type: 'TIER1'  as const, description: 'State capitals & major cities — pop > 10 lakh' },
      { name: 'Tier 2',          type: 'TIER2'  as const, description: 'District HQs & mid-sized cities — pop 3-10 lakh' },
      { name: 'Tier 3',          type: 'TIER3'  as const, description: 'Small towns — pop 1-3 lakh' },
      { name: 'Rural',           type: 'RURAL'  as const, description: 'Villages & remote towns' },
      { name: 'Remote',          type: 'REMOTE' as const, description: 'NE India, J&K, Ladakh, Andaman, Lakshadweep' },
      { name: 'Non-Serviceable', type: 'NON_SERVICEABLE' as const, description: 'Currently not serviced' },
    ]

    const zones: Record<string, string> = {}
    for (const z of zoneData) {
      const zone = await db.shippingZone.upsert({
        where: { name: z.name },
        update: { type: z.type, description: z.description },
        create: z,
      })
      zones[z.type] = zone.id
    }

    // ── 2. Create shipping policies (zone → zone transit matrix) ─
    // Industry-standard transit times (similar to Delhivery/BlueDart)
    const policies = [
      // Origin: METRO
      { origin: 'METRO', dest: 'METRO',  min: 1, max: 3, cost: 0,  free: 499, express: true,  expMin: 1, expMax: 1, expCost: 99 },
      { origin: 'METRO', dest: 'TIER1',  min: 2, max: 4, cost: 40, free: 599, express: true,  expMin: 1, expMax: 2, expCost: 129 },
      { origin: 'METRO', dest: 'TIER2',  min: 3, max: 6, cost: 50, free: 699, express: true,  expMin: 2, expMax: 3, expCost: 149 },
      { origin: 'METRO', dest: 'TIER3',  min: 4, max: 7, cost: 60, free: 799, express: false },
      { origin: 'METRO', dest: 'RURAL',  min: 5, max: 9, cost: 70, free: 999, express: false },
      { origin: 'METRO', dest: 'REMOTE', min: 7, max: 14, cost: 99, free: null, express: false },
      // Origin: TIER1
      { origin: 'TIER1', dest: 'METRO',  min: 2, max: 4, cost: 40, free: 599, express: true,  expMin: 1, expMax: 2, expCost: 129 },
      { origin: 'TIER1', dest: 'TIER1',  min: 2, max: 5, cost: 40, free: 599, express: true,  expMin: 2, expMax: 3, expCost: 149 },
      { origin: 'TIER1', dest: 'TIER2',  min: 3, max: 6, cost: 50, free: 699, express: false },
      { origin: 'TIER1', dest: 'TIER3',  min: 4, max: 7, cost: 60, free: 799, express: false },
      { origin: 'TIER1', dest: 'RURAL',  min: 5, max: 10, cost: 70, free: 999, express: false },
      { origin: 'TIER1', dest: 'REMOTE', min: 7, max: 14, cost: 99, free: null, express: false },
      // Origin: TIER2
      { origin: 'TIER2', dest: 'METRO',  min: 3, max: 5, cost: 50, free: 699, express: false },
      { origin: 'TIER2', dest: 'TIER1',  min: 3, max: 6, cost: 50, free: 699, express: false },
      { origin: 'TIER2', dest: 'TIER2',  min: 4, max: 7, cost: 50, free: 799, express: false },
      { origin: 'TIER2', dest: 'TIER3',  min: 5, max: 8, cost: 60, free: 799, express: false },
      { origin: 'TIER2', dest: 'RURAL',  min: 6, max: 10, cost: 70, free: 999, express: false },
      { origin: 'TIER2', dest: 'REMOTE', min: 8, max: 14, cost: 99, free: null, express: false },
    ]

    let policyCount = 0
    for (const p of policies) {
      const originId = zones[p.origin]
      const destId = zones[p.dest]
      if (!originId || !destId) continue

      await db.shippingPolicy.upsert({
        where: { originZoneId_destinationZoneId: { originZoneId: originId, destinationZoneId: destId } },
        update: {
          minDays: p.min, maxDays: p.max, baseCost: p.cost,
          freeShippingAbove: p.free, isExpressAvailable: p.express,
          expressMinDays: p.expMin ?? null, expressMaxDays: p.expMax ?? null, expressCost: p.expCost ?? null,
        },
        create: {
          originZoneId: originId, destinationZoneId: destId,
          minDays: p.min, maxDays: p.max, baseCost: p.cost,
          freeShippingAbove: p.free, isExpressAvailable: p.express,
          expressMinDays: p.expMin ?? null, expressMaxDays: p.expMax ?? null, expressCost: p.expCost ?? null,
        },
      })
      policyCount++
    }

    // ── 3. Seed top Indian pincodes (major cities) ───────
    const metroPincodes = [
      // Mumbai
      { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai' },
      { pincode: '400050', city: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban' },
      { pincode: '400070', city: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban' },
      { pincode: '400080', city: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban' },
      { pincode: '400093', city: 'Mumbai', state: 'Maharashtra', stateCode: 'MH', district: 'Mumbai Suburban' },
      { pincode: '400601', city: 'Thane', state: 'Maharashtra', stateCode: 'MH', district: 'Thane' },
      { pincode: '410210', city: 'Navi Mumbai', state: 'Maharashtra', stateCode: 'MH', district: 'Raigad' },
      // Delhi NCR
      { pincode: '110001', city: 'New Delhi', state: 'Delhi', stateCode: 'DL', district: 'Central Delhi' },
      { pincode: '110020', city: 'New Delhi', state: 'Delhi', stateCode: 'DL', district: 'South Delhi' },
      { pincode: '110085', city: 'New Delhi', state: 'Delhi', stateCode: 'DL', district: 'North West Delhi' },
      { pincode: '120001', city: 'Faridabad', state: 'Haryana', stateCode: 'HR', district: 'Faridabad' },
      { pincode: '121001', city: 'Faridabad', state: 'Haryana', stateCode: 'HR', district: 'Faridabad' },
      { pincode: '122001', city: 'Gurugram', state: 'Haryana', stateCode: 'HR', district: 'Gurugram' },
      { pincode: '201301', city: 'Noida', state: 'Uttar Pradesh', stateCode: 'UP', district: 'Gautam Buddha Nagar' },
      { pincode: '201010', city: 'Ghaziabad', state: 'Uttar Pradesh', stateCode: 'UP', district: 'Ghaziabad' },
      // Bangalore
      { pincode: '560001', city: 'Bangalore', state: 'Karnataka', stateCode: 'KA', district: 'Bangalore Urban' },
      { pincode: '560034', city: 'Bangalore', state: 'Karnataka', stateCode: 'KA', district: 'Bangalore Urban' },
      { pincode: '560100', city: 'Bangalore', state: 'Karnataka', stateCode: 'KA', district: 'Bangalore Rural' },
      // Hyderabad
      { pincode: '500001', city: 'Hyderabad', state: 'Telangana', stateCode: 'TG', district: 'Hyderabad' },
      { pincode: '500081', city: 'Hyderabad', state: 'Telangana', stateCode: 'TG', district: 'Rangareddy' },
      // Chennai
      { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai' },
      { pincode: '600040', city: 'Chennai', state: 'Tamil Nadu', stateCode: 'TN', district: 'Chennai' },
      { pincode: '600100', city: 'Chennai', state: 'Tamil Nadu', stateCode: 'TN', district: 'Kancheepuram' },
      // Kolkata
      { pincode: '700001', city: 'Kolkata', state: 'West Bengal', stateCode: 'WB', district: 'Kolkata' },
      { pincode: '700091', city: 'Kolkata', state: 'West Bengal', stateCode: 'WB', district: 'South 24 Parganas' },
      // Pune
      { pincode: '411001', city: 'Pune', state: 'Maharashtra', stateCode: 'MH', district: 'Pune' },
      { pincode: '411057', city: 'Pune', state: 'Maharashtra', stateCode: 'MH', district: 'Pune' },
      // Ahmedabad
      { pincode: '380001', city: 'Ahmedabad', state: 'Gujarat', stateCode: 'GJ', district: 'Ahmedabad' },
      { pincode: '380015', city: 'Ahmedabad', state: 'Gujarat', stateCode: 'GJ', district: 'Ahmedabad' },
    ]

    const tier1Pincodes = [
      { pincode: '302001', city: 'Jaipur', state: 'Rajasthan', stateCode: 'RJ', district: 'Jaipur' },
      { pincode: '226001', city: 'Lucknow', state: 'Uttar Pradesh', stateCode: 'UP', district: 'Lucknow' },
      { pincode: '160001', city: 'Chandigarh', state: 'Chandigarh', stateCode: 'CH', district: 'Chandigarh' },
      { pincode: '452001', city: 'Indore', state: 'Madhya Pradesh', stateCode: 'MP', district: 'Indore' },
      { pincode: '462001', city: 'Bhopal', state: 'Madhya Pradesh', stateCode: 'MP', district: 'Bhopal' },
      { pincode: '800001', city: 'Patna', state: 'Bihar', stateCode: 'BR', district: 'Patna' },
      { pincode: '682001', city: 'Kochi', state: 'Kerala', stateCode: 'KL', district: 'Ernakulam' },
      { pincode: '641001', city: 'Coimbatore', state: 'Tamil Nadu', stateCode: 'TN', district: 'Coimbatore' },
      { pincode: '440001', city: 'Nagpur', state: 'Maharashtra', stateCode: 'MH', district: 'Nagpur' },
      { pincode: '530001', city: 'Visakhapatnam', state: 'Andhra Pradesh', stateCode: 'AP', district: 'Visakhapatnam' },
      { pincode: '395001', city: 'Surat', state: 'Gujarat', stateCode: 'GJ', district: 'Surat' },
      { pincode: '390001', city: 'Vadodara', state: 'Gujarat', stateCode: 'GJ', district: 'Vadodara' },
      { pincode: '695001', city: 'Thiruvananthapuram', state: 'Kerala', stateCode: 'KL', district: 'Thiruvananthapuram' },
    ]

    const tier2Pincodes = [
      { pincode: '431001', city: 'Aurangabad', state: 'Maharashtra', stateCode: 'MH', district: 'Aurangabad' },
      { pincode: '360001', city: 'Rajkot', state: 'Gujarat', stateCode: 'GJ', district: 'Rajkot' },
      { pincode: '492001', city: 'Raipur', state: 'Chhattisgarh', stateCode: 'CG', district: 'Raipur' },
      { pincode: '834001', city: 'Ranchi', state: 'Jharkhand', stateCode: 'JH', district: 'Ranchi' },
      { pincode: '751001', city: 'Bhubaneswar', state: 'Odisha', stateCode: 'OD', district: 'Khordha' },
      { pincode: '322001', city: 'Sawai Madhopur', state: 'Rajasthan', stateCode: 'RJ', district: 'Sawai Madhopur' },
      { pincode: '250001', city: 'Meerut', state: 'Uttar Pradesh', stateCode: 'UP', district: 'Meerut' },
      { pincode: '208001', city: 'Kanpur', state: 'Uttar Pradesh', stateCode: 'UP', district: 'Kanpur Nagar' },
      { pincode: '221001', city: 'Varanasi', state: 'Uttar Pradesh', stateCode: 'UP', district: 'Varanasi' },
    ]

    const remotePincodes = [
      { pincode: '190001', city: 'Srinagar', state: 'Jammu & Kashmir', stateCode: 'JK', district: 'Srinagar' },
      { pincode: '180001', city: 'Jammu', state: 'Jammu & Kashmir', stateCode: 'JK', district: 'Jammu' },
      { pincode: '781001', city: 'Guwahati', state: 'Assam', stateCode: 'AS', district: 'Kamrup Metro' },
      { pincode: '795001', city: 'Imphal', state: 'Manipur', stateCode: 'MN', district: 'Imphal West' },
      { pincode: '793001', city: 'Shillong', state: 'Meghalaya', stateCode: 'ML', district: 'East Khasi Hills' },
      { pincode: '744101', city: 'Port Blair', state: 'Andaman & Nicobar', stateCode: 'AN', district: 'South Andaman' },
    ]

    let pincodeCount = 0
    const allPincodes = [
      ...metroPincodes.map(p => ({ ...p, zoneType: 'METRO' })),
      ...tier1Pincodes.map(p => ({ ...p, zoneType: 'TIER1' })),
      ...tier2Pincodes.map(p => ({ ...p, zoneType: 'TIER2' })),
      ...remotePincodes.map(p => ({ ...p, zoneType: 'REMOTE' })),
    ]

    for (const p of allPincodes) {
      const zoneId = zones[p.zoneType]
      if (!zoneId) continue

      await db.pincodeEntry.upsert({
        where: { pincode: p.pincode },
        update: { city: p.city, state: p.state, stateCode: p.stateCode, district: p.district, zoneId },
        create: {
          pincode: p.pincode, city: p.city, state: p.state,
          stateCode: p.stateCode, district: p.district, zoneId,
          isServiceable: true, isCODAvailable: p.zoneType !== 'REMOTE',
        },
      })
      pincodeCount++
    }

    return ok({
      zones: Object.keys(zones).length,
      policies: policyCount,
      pincodes: pincodeCount,
      message: 'Shipping data seeded successfully',
    })
  } catch (err) {
    console.error('Shipping seed error:', err)
    return serverError()
  }
}
