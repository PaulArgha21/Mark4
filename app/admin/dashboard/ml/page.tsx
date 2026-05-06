'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  Brain, TrendingUp, Package, ShoppingCart, AlertTriangle, Zap,
  ArrowRight, BarChart3, Target, Layers
} from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { ClayButton } from '@/components/ui/ClayButton'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export default function MLDashboard() {
  const { data: insights, isLoading: loadingInsights } = useSWR('/api/ml/insights', fetcher)
  const { data: analytics, isLoading: loadingAnalytics } = useSWR('/api/ml/analytics?days=7', fetcher)
  const [creatingBundle, setCreatingBundle] = useState<number | null>(null)

  const isLoading = loadingInsights || loadingAnalytics

  const handleCreateBundle = async (bundleIdx: number, products: { id: string; name: string }[]) => {
    setCreatingBundle(bundleIdx)
    try {
      const name = products.map(p => p.name.split(' ')[0]).join(' + ') + ' Bundle'
      await fetch('/api/portal/cms/promotions', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: `AI-suggested bundle: ${products.map(p => p.name).join(' & ')}`,
          type: 'BUNDLE_DEAL',
          config: {
            productIds: products.map(p => p.id),
            source: 'ml_auto_bundle',
            suggestedDiscount: insights?.bundleSuggestions?.[bundleIdx]?.suggestedDiscount ?? 10,
          },
          isActive: false,
        }),
      })
      toast.success(`Bundle "${name}" created as draft promotion. Activate it when ready.`)
    } catch { toast.error('Failed to create bundle') }
    finally { setCreatingBundle(null) }
  }

  const handleFeatureProduct = async (productId: string, productName: string) => {
    try {
      await fetch('/api/portal/cms/homepage-sections', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: [{ id: 'featured', type: 'FEATURED_PRODUCTS', isVisible: true, sortOrder: 5,
            config: { productIds: [productId] } }],
        }),
      })
      toast.success(`"${productName}" pushed to Featured section`)
    } catch { toast.error('Failed') }
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'var(--portal-accent)', color: '#fff' }}><Brain size={22} /></div>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>ML Intelligence Hub</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>
              AI-powered insights, auto-bundle suggestions, and actionable recommendations
            </p>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--portal-surface)' }} />
          ))}</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Views (24h)', value: insights?.revenueOpportunity?.totalViews24h?.toLocaleString() ?? '0', icon: BarChart3, color: '#3b82f6' },
                { label: 'Conversion Rate', value: `${insights?.revenueOpportunity?.overallConversion ?? 0}%`, icon: Target, color: '#22c55e' },
                { label: 'Abandoned Carts (7d)', value: insights?.revenueOpportunity?.abandonedCarts7d?.toLocaleString() ?? '0', icon: ShoppingCart, color: '#f59e0b' },
                { label: 'Trending Products', value: analytics?.health?.trendingProductsComputed?.toString() ?? '0', icon: TrendingUp, color: '#8b5cf6' },
              ].map((kpi, i) => (
                <motion.div key={i} variants={fadeUpVariants} className="p-4 rounded-xl"
                  style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                  <p className="text-2xl font-bold mt-2" style={{ color: 'var(--portal-text)' }}>{kpi.value}</p>
                  <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{kpi.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Conversion Funnel */}
            {analytics?.funnel && (
              <motion.div variants={fadeUpVariants} className="p-5 rounded-xl"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                  <Target size={16} /> Conversion Funnel (7d)
                </h3>
                <div className="flex items-center gap-3 overflow-x-auto">
                  {[
                    { label: 'Views', count: analytics.funnel.views, pct: 100 },
                    { label: 'Add to Cart', count: analytics.funnel.addToCart, pct: analytics.funnel.viewToCartRate },
                    { label: 'Wishlist', count: analytics.funnel.wishlist, pct: 0 },
                    { label: 'Purchases', count: analytics.funnel.purchases, pct: analytics.funnel.overallConversionRate },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="text-center min-w-[80px]">
                        <p className="text-lg font-bold" style={{ color: 'var(--portal-text)' }}>{step.count.toLocaleString()}</p>
                        <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{step.label}</p>
                        {step.pct > 0 && step.pct < 100 && (
                          <p className="text-xs font-medium mt-1" style={{ color: 'var(--portal-accent)' }}>{step.pct}%</p>
                        )}
                      </div>
                      {i < 3 && <ArrowRight size={14} style={{ color: 'var(--portal-muted)' }} />}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Auto-Bundle Suggestions */}
            <motion.div variants={fadeUpVariants} className="p-5 rounded-xl"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                <Layers size={16} /> Auto-Bundle Suggestions
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--portal-muted)' }}>
                Products frequently purchased together. Create a bundle promotion with one click.
              </p>
              {!insights?.bundleSuggestions?.length ? (
                <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Not enough purchase data yet for bundle suggestions.</p>
              ) : (
                <div className="space-y-3">
                  {insights.bundleSuggestions.map((bundle: { products: { id: string; name: string; slug: string; image?: string; basePrice?: number }[]; coPurchaseCount: number; suggestedDiscount: number }, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg"
                      style={{ background: 'var(--portal-elevated)', border: '1px solid var(--portal-border)' }}>
                      <div className="flex -space-x-2">
                        {bundle.products.map((p: { id: string; name: string; image?: string; media?: { url: string }[] }, pi: number) => (
                          <div key={pi} className="w-10 h-10 rounded-lg overflow-hidden ring-2"
                            style={{ ringColor: 'var(--portal-elevated)' } as React.CSSProperties}>
                            {(p.image ?? p.media?.[0]?.url) ? (
                              <img src={(p.image ?? p.media?.[0]?.url)!} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--portal-surface)' }}>
                                <Package size={12} style={{ color: 'var(--portal-muted)' }} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--portal-text)' }}>
                          {bundle.products.map((p: { name: string }) => p.name).join(' + ')}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                          {bundle.coPurchaseCount} co-purchases · suggested {bundle.suggestedDiscount}% off
                        </p>
                      </div>
                      <ClayButton variant="primary" size="sm"
                        loading={creatingBundle === idx}
                        onClick={() => handleCreateBundle(idx, bundle.products)}>
                        <Zap size={12} /> Create Bundle
                      </ClayButton>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Promo Recommendations */}
            <motion.div variants={fadeUpVariants} className="p-5 rounded-xl"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                <AlertTriangle size={16} className="text-amber-400" /> Promotion Recommendations
              </h3>
              <p className="text-xs mb-4" style={{ color: 'var(--portal-muted)' }}>
                Products with high views but low conversions — potential revenue boost with targeted promotions.
              </p>
              {!insights?.promoRecommendations?.length ? (
                <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>No promotion recommendations at this time.</p>
              ) : (
                <div className="space-y-2">
                  {insights.promoRecommendations.map((rec: { product: { id: string; name: string; slug: string; media?: { url: string }[] }; views24h: number; addToCart24h: number; purchases24h: number; conversionGap: number; suggestion: string }, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--portal-elevated)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{rec.product.name}</p>
                        <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                          {rec.views24h} views · {rec.addToCart24h} carts · {rec.purchases24h} purchases · {rec.conversionGap}% gap
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--portal-accent)' }}>{rec.suggestion}</p>
                      </div>
                      <ClayButton variant="ghost" size="sm" onClick={() => handleFeatureProduct(rec.product.id, rec.product.name)}>
                        Feature
                      </ClayButton>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Top Trending */}
            {analytics?.topTrending?.length > 0 && (
              <motion.div variants={fadeUpVariants} className="p-5 rounded-xl"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                  <TrendingUp size={16} /> Top Trending Products
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ color: 'var(--portal-muted)' }}>
                        <th className="text-left py-2 text-xs font-medium">Product</th>
                        <th className="text-right py-2 text-xs font-medium">Score</th>
                        <th className="text-right py-2 text-xs font-medium">Views</th>
                        <th className="text-right py-2 text-xs font-medium">Cart</th>
                        <th className="text-right py-2 text-xs font-medium">Purchases</th>
                        <th className="text-right py-2 text-xs font-medium">Conv%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topTrending.map((t: { productId: string; name: string; brand?: string; score: number; views24h: number; addToCart24h: number; purchases24h: number; conversionRate24h: number }) => (
                        <tr key={t.productId} style={{ borderTop: '1px solid var(--portal-border)' }}>
                          <td className="py-2" style={{ color: 'var(--portal-text)' }}>
                            <span className="font-medium">{t.name}</span>
                            {t.brand && <span className="text-xs ml-1" style={{ color: 'var(--portal-muted)' }}>{t.brand}</span>}
                          </td>
                          <td className="text-right py-2 font-mono" style={{ color: 'var(--portal-accent)' }}>{t.score}</td>
                          <td className="text-right py-2" style={{ color: 'var(--portal-muted)' }}>{t.views24h}</td>
                          <td className="text-right py-2" style={{ color: 'var(--portal-muted)' }}>{t.addToCart24h}</td>
                          <td className="text-right py-2" style={{ color: 'var(--portal-muted)' }}>{t.purchases24h}</td>
                          <td className="text-right py-2 font-medium" style={{ color: t.conversionRate24h > 5 ? '#22c55e' : '#f59e0b' }}>{t.conversionRate24h}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Overstocked Inventory */}
            {insights?.inventoryInsights?.overstocked?.length > 0 && (
              <motion.div variants={fadeUpVariants} className="p-5 rounded-xl"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                  <Package size={16} /> Overstocked — Consider Flash Sale
                </h3>
                <div className="space-y-2">
                  {insights.inventoryInsights.overstocked.map((item: { variant: { id: string; sku: string; size?: string; color?: string; product: { name: string } }; quantity: number; netAvailable: number }, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{item.variant.product.name}</p>
                        <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>
                          SKU: {item.variant.sku} {item.variant.size && `· ${item.variant.size}`} {item.variant.color && `· ${item.variant.color}`}
                        </p>
                      </div>
                      <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>{item.netAvailable} units</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Trending Categories */}
            {insights?.trendingCategories?.length > 0 && (
              <motion.div variants={fadeUpVariants} className="p-5 rounded-xl"
                style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--portal-text)' }}>
                  <TrendingUp size={16} /> Trending Categories (7d)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {insights.trendingCategories.map((tc: { category: { name: string }; viewCount7d: number }, i: number) => (
                    <div key={i} className="px-3 py-2 rounded-lg" style={{ background: 'var(--portal-elevated)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--portal-text)' }}>{tc.category.name}</p>
                      <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{tc.viewCount7d} views</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </PortalShell>
  )
}
