export const runtime = 'nodejs'

import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Called by Vercel cron: "0 * * * *" (every hour)
// Computes composite trending scores from user events over last 24h
// Score weights: page_view=1, add_to_cart=2, add_to_wishlist=3, purchase=5
// Includes velocity bonus for surging products

export async function GET(request: Request) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const now = new Date()
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const since6h = new Date(now.getTime() - 6 * 60 * 60 * 1000)
    const since1h = new Date(now.getTime() - 1 * 60 * 60 * 1000)

    // Aggregate events from last 24h
    const events24h = await db.userEvent.groupBy({
      by: ['productId', 'eventType'],
      where: {
        productId: { not: null },
        createdAt: { gte: since24h },
      },
      _count: { eventType: true },
    })

    // Aggregate events from last 6h (for velocity calculation)
    const events6h = await db.userEvent.groupBy({
      by: ['productId', 'eventType'],
      where: {
        productId: { not: null },
        createdAt: { gte: since6h },
      },
      _count: { eventType: true },
    })

    // Aggregate events from last 1h (for surge detection)
    const events1h = await db.userEvent.groupBy({
      by: ['productId', 'eventType'],
      where: {
        productId: { not: null },
        createdAt: { gte: since1h },
      },
      _count: { eventType: true },
    })

    // Base event weights
    const WEIGHTS: Record<string, number> = {
      page_view: 1,
      product_view: 1,
      add_to_cart: 2,
      add_to_wishlist: 3,
      purchase: 5,
      search_click: 1.5,
      share: 2,
    }

    // Build score maps
    type ScoreEntry = {
      score24h: number; score6h: number; score1h: number;
      views: number; cart: number; purchase: number; wishlist: number
    }
    const scoreMap = new Map<string, ScoreEntry>()

    const ensureEntry = (productId: string): ScoreEntry => {
      if (!scoreMap.has(productId)) {
        scoreMap.set(productId, { score24h: 0, score6h: 0, score1h: 0, views: 0, cart: 0, purchase: 0, wishlist: 0 })
      }
      return scoreMap.get(productId)!
    }

    // 24h base scores
    for (const e of events24h) {
      if (!e.productId) continue
      const s = ensureEntry(e.productId)
      const count = e._count.eventType
      const weight = WEIGHTS[e.eventType] ?? 1
      s.score24h += count * weight

      switch (e.eventType) {
        case 'page_view': case 'product_view': s.views += count; break
        case 'add_to_cart': s.cart += count; break
        case 'add_to_wishlist': s.wishlist += count; break
        case 'purchase': s.purchase += count; break
      }
    }

    // 6h velocity scores
    for (const e of events6h) {
      if (!e.productId) continue
      const s = ensureEntry(e.productId)
      const weight = WEIGHTS[e.eventType] ?? 1
      s.score6h += e._count.eventType * weight
    }

    // 1h surge scores
    for (const e of events1h) {
      if (!e.productId) continue
      const s = ensureEntry(e.productId)
      const weight = WEIGHTS[e.eventType] ?? 1
      s.score1h += e._count.eventType * weight
    }

    // Compute composite score with velocity and surge bonuses
    // Final score = base_24h + (6h_velocity * 1.5) + (1h_surge * 3.0)
    // This rewards products that are trending RIGHT NOW more heavily
    const upserts = Array.from(scoreMap.entries()).map(([productId, data]) => {
      const compositeScore =
        data.score24h +
        (data.score6h * 1.5) +
        (data.score1h * 3.0)

      return db.trendingScore.upsert({
        where: { productId },
        update: {
          score: compositeScore,
          viewCount24h: data.views,
          addToCart24h: data.cart,
          purchase24h: data.purchase,
          wishlist24h: data.wishlist,
          computedAt: now,
        },
        create: {
          productId,
          score: compositeScore,
          viewCount24h: data.views,
          addToCart24h: data.cart,
          purchase24h: data.purchase,
          wishlist24h: data.wishlist,
        },
      })
    })

    // Batch in chunks of 50 to avoid overwhelming DB
    const BATCH_SIZE = 50
    let updated = 0
    for (let i = 0; i < upserts.length; i += BATCH_SIZE) {
      const batch = upserts.slice(i, i + BATCH_SIZE)
      await db.$transaction(batch)
      updated += batch.length
    }

    // Decay old scores that had no events in 24h
    await db.trendingScore.updateMany({
      where: {
        computedAt: { lt: since24h },
      },
      data: {
        score: 0,
        viewCount24h: 0,
        addToCart24h: 0,
        purchase24h: 0,
        wishlist24h: 0,
      },
    })

    return NextResponse.json({
      success: true,
      updated,
      topScores: Array.from(scoreMap.entries())
        .sort((a, b) => (b[1].score24h + b[1].score6h * 1.5 + b[1].score1h * 3) - (a[1].score24h + a[1].score6h * 1.5 + a[1].score1h * 3))
        .slice(0, 5)
        .map(([id, d]) => ({ productId: id, score: Math.round(d.score24h + d.score6h * 1.5 + d.score1h * 3) })),
    })
  } catch (err) {
    console.error('Compute trending error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
