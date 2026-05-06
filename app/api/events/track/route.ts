export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// RULE: This endpoint ALWAYS returns 202. Never blocks.

const eventSchema = z.object({
  eventType:    z.string(),
  userId:       z.string().optional(),
  sessionId:    z.string().optional(),
  productId:    z.string().optional(),
  variantId:    z.string().optional(),
  categoryId:   z.string().optional(),
  collectionId: z.string().optional(),
  searchQuery:  z.string().optional(),
  metadata:     z.record(z.string(), z.unknown()).optional(),
  deviceType:   z.string().optional(),
})

export async function POST(request: Request) {
  // Always return 202 immediately
  const response = new NextResponse(null, { status: 202 })

  // Process async — does not block response
  ;(async () => {
    try {
      const body = await request.json()
      const parsed = eventSchema.safeParse(body)
      if (!parsed.success) return

      await db.userEvent.create({
        data: {
          eventType:    parsed.data.eventType,
          userId:       parsed.data.userId ?? null,
          sessionId:    parsed.data.sessionId ?? null,
          productId:    parsed.data.productId ?? null,
          variantId:    parsed.data.variantId ?? null,
          categoryId:   parsed.data.categoryId ?? null,
          collectionId: parsed.data.collectionId ?? null,
          searchQuery:  parsed.data.searchQuery ?? null,
          metadata:     parsed.data.metadata ? JSON.parse(JSON.stringify(parsed.data.metadata)) : undefined,
          deviceType:   parsed.data.deviceType ?? null,
        },
      })
    } catch {
      // Silently drop malformed events
    }
  })()

  return response
}
