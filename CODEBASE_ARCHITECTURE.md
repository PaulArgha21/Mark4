# APRDITE — Codebase Architecture & Knowledge Base

> **Last updated:** Sprint 16 complete (FINAL) | **Build:** 78 pages + sitemap + robots, 58 API routes (ALL production), 0 errors

---

## 1. TECH STACK

- **Framework:** Next.js 14.2.35 (App Router), TypeScript ^5
- **Styling:** Tailwind CSS ^3.4 + Clay Design System CSS variables
- **Animation:** Framer Motion ^11.18
- **DB:** Prisma 5.22.0 → PostgreSQL (Supabase)
- **Cache:** Upstash Redis + @upstash/ratelimit
- **Storage:** Cloudflare R2 via @aws-sdk/client-s3
- **Auth:** jsonwebtoken (server) + jose (Edge middleware)
- **Validation:** Zod ^4.4
- **Data Fetching:** SWR ^2.4
- **UI:** Radix UI, Lucide React, CVA, Sonner

---

## 2. FILE STRUCTURE

```
aprdite/
├── app/
│   ├── layout.tsx               # Root: fonts, Toaster, globals.css
│   ├── globals.css              # Clay Design System CSS variables
│   ├── page.tsx                 # Homepage
│   ├── login/page.tsx           # Customer login
│   ├── register/page.tsx        # Customer register
│   ├── search/page.tsx          # Product search
│   ├── category/[slug]/page.tsx # PLP
│   ├── product/[slug]/page.tsx  # PDP
│   ├── cart/page.tsx            # Cart
│   ├── checkout/page.tsx        # Checkout
│   ├── account/
│   │   ├── layout.tsx           # Account sidebar + useAuth
│   │   ├── page.tsx             # Profile
│   │   ├── orders/              # Order history
│   │   ├── wishlist/            # Saved items
│   │   ├── addresses/           # Address management
│   │   └── settings/            # Account settings
│   ├── admin/
│   │   ├── login/               # Employee login
│   │   ├── dashboard/           # Stats + products/orders/customers/audit/settings
│   │   ├── cms/                 # CMS hub + builder
│   │   ├── finance/             # Revenue, refunds, GST
│   │   ├── inventory/           # Stock management
│   │   └── offers/              # Coupons, flash sales, bundles
│   └── api/                     # See Section 5
├── components/
│   ├── ui/                      # ClayButton, ClayBadge, ClayProductCard, PriceDisplay, SkeletonLoaders, StarRating
│   ├── storefront/
│   │   ├── home/                # HeroCarousel, StoryBubbles, CategoryGrid, FlashSaleStrip, NewArrivalsRow, GalleryCollage
│   │   ├── layout/              # StorefrontShell, StorefrontHeader, StorefrontFooter, BottomNav, AnnouncementBar
│   │   ├── plp/                 # FilterSidebar
│   │   └── pdp/                 # ProductGallery, ColorSelector, SizeSelector, ReviewsSection
│   └── portal/
│       ├── layout/              # PortalShell, PortalSidebar (role-aware nav)
│       └── shared/              # CredentialGate (password re-entry)
├── hooks/
│   ├── useAuth.ts               # Customer auth (SWR → /api/auth/me)
│   └── useCart.ts               # Cart state (SWR → /api/storefront/cart)
├── lib/                         # See Section 3
├── prisma/
│   ├── schema.prisma            # 1651 lines, 60+ models
│   └── seed.ts                  # SUPERADMIN + permissions + site settings
├── middleware.ts                 # Edge: JWT verify + RBAC routing
├── .env / .env.local / .env.example
├── tailwind.config.ts
├── next.config.mjs
└── package.json
```

---

## 3. LIB FILES — PURPOSE & RELATIONSHIPS

### Infrastructure (Sprint 0)

| File | Purpose | Consumed By |
|------|---------|-------------|
| `db.ts` | PrismaClient singleton | All DB-touching API routes |
| `redis.ts` | Upstash Redis client | rate-limit, cache, permissions, verify-credential |
| `r2.ts` | R2 signed URL generation | Future media upload routes |
| `rate-limit.ts` | 5 limiters: authRegister(3/m), authLogin(5/m), empLogin(5/15m), apiGeneral(60/m), apiWrite(20/m) + `getClientIp()` | Auth routes, future write APIs |
| `audit.ts` | `logAuditEntry()` fire-and-forget to EmployeeAuditLog | All portal write operations |
| `cache.ts` | `CACHE_KEYS` + `invalidateCmsCache()` (Redis DEL + ISR + SSE) | CMS routes, homepage |
| `permissions.ts` | RBAC: `ROLE_PERMISSIONS` matrix, `hasPermission()`, `requireEmployeeAuth()`, `requirePermission()`, `requireCredentialElevation()` | All portal API routes |
| `api-response.ts` | `ok`, `created`, `noContent`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `serverError` | Every API route |
| `middleware-utils.ts` | `requireCustomerAuth()` — JWT verify + DB fetch | Storefront auth-required APIs |
| `customer-jwt.ts` | `generateCustomerTokenPair(userId)`, `verifyCustomerToken()`, `verifyCustomerRefreshToken()` | Auth routes, middleware-utils |
| `employee-jwt.ts` | `generateEmployeeTokenPair(id, role)`, `verifyEmployeeToken()`, `verifyEmployeeRefreshToken()` | Employee auth routes, permissions |

### UI/UX Utilities (Pre-Sprint)

| File | Purpose |
|------|---------|
| `animations.ts` | Framer Motion presets (fadeUp, stagger, springs, buttonHover) |
| `utils.ts` | `cn()` classname merger, `formatPrice()` |
| `types.ts` | 15+ shared TS interfaces (User, ProductCard, CartData, Order, etc.) |
| `mock-data.ts` | Dev mock data for storefront APIs. **Will be replaced by DB queries.** |

---

## 4. MIDDLEWARE

**File:** `middleware.ts` (Edge Runtime, uses `jose`)

- **Portal** (`/admin/*` except login): verify `employee_access_token` cookie → check role against allowed path prefixes → redirect if unauthorized
- **Customer** (`/account/*`, `/checkout/*`): verify `access_token` cookie → redirect to `/login?redirect=...`

**Role → Paths:** SUPERADMIN=all, ADMIN=all dashboard sections, MARKETING=cms, FINANCE=finance, OPERATIONS=inventory, OFFERS=offers

---

## 5. API ROUTES — STATUS

### Production (Sprint 0-1)

| Route | What It Does |
|-------|-------------|
| `POST /api/auth/register` | Zod → rate limit → uniqueness → bcrypt → DB create + Loyalty → JWT → cookies |
| `POST /api/auth/login` | Rate limit → DB find → bcrypt → blocked check → JWT → cookies |
| `POST /api/auth/refresh` | Verify refresh cookie → new access token |
| `GET /api/auth/me` | Verify JWT → fetch user from DB |
| `POST /api/auth/logout` | Clear cookies |
| `POST /api/employee/auth/login` | Rate limit → lockout check → bcrypt → failure counter → session DB → JWT → audit |
| `GET /api/employee/auth/me` | Verify JWT → fetch employee |
| `POST /api/employee/auth/verify-credential` | Bcrypt → Redis elevation (5min) → session update |
| `POST /api/employee/auth/refresh` | Verify refresh → new access token |
| `POST /api/employee/auth/logout` | Delete session → audit → clear cookies |
| `GET /api/health` | DB + Redis health check |
| `GET /api/revalidate` | ISR on-demand revalidation |

### Storefront Data (ALL PRODUCTION ✅)

| Route | Method | Status | What It Does |
|-------|--------|--------|-------------|
| `GET /api/storefront/homepage` | GET | ✅ Real | Redis cache (60s) → DB: sections, hero slides, stories, flash sale, featured, new arrivals, gallery, site settings |
| `GET /api/storefront/categories` | GET | ✅ Real | Redis cache (5m) → DB: category tree with product counts |
| `GET /api/storefront/site-settings` | GET | ✅ Real | Redis cache (5m) → DB: site name, announcement, colors, meta, socials, contact, footer |
| `GET /api/storefront/products` | GET | ✅ Real | Prisma: full filter (category, collection, size, color, price, rating, discount), sort, pagination, card-friendly transform |
| `GET /api/storefront/products/[slug]` | GET | ✅ Real | Redis cache (2m) → DB: full product with category, media, variants+stock, tags, reviews, rating distribution, same-collection products |
| `GET /api/storefront/cart` | GET | ✅ Real | Auth/session cart → DB: CartItems → Variant → Product + Inventory + Media, compute lineTotal + subtotal + shipping + tax |
| `POST/DEL /api/storefront/cart/items` | POST/DELETE | ✅ Real | POST: Zod → inventory check → upsert CartItem (auth or session cart). DELETE: remove CartItem by id |
| `GET /api/storefront/orders` | GET | ✅ Real | requireCustomerAuth → paginated DB query with items + product media + variant info + shipment |
| `GET/POST /api/storefront/wishlist` | GET/POST | ✅ Real | GET: upsert wishlist + batch-fetch products. POST: verify product + upsert WishlistItem |

### Portal Data (ALL PRODUCTION ✅)

| Route | Method | Status | What It Does |
|-------|--------|--------|-------------|
| `GET /api/portal/analytics/summary` | GET | ✅ Real | requirePermission(analytics.full) → DB aggregates: revenueMTD, ordersToday, pendingOrders, totalUsers, lowStock, flashSales |
| `GET/PUT /api/portal/cms/homepage-sections` | GET/PUT | ✅ Real | GET: requirePermission(cms.homepage) → DB sections. PUT: transaction update + audit log + cache invalidation |
| `GET /api/portal/products` | GET | ✅ Real | requirePermission(products.view) → paginated list with search, category, status filters, sort |
| `POST /api/portal/products` | POST | ✅ Real | requirePermission(products.create) → Zod → slugify → create Product + Variants + Inventory in transaction + audit |
| `GET /api/portal/products/[id]` | GET | ✅ Real | requirePermission(products.view) → full product with variants, inventory, tags, media |
| `PUT /api/portal/products/[id]` | PUT | ✅ Real | requirePermission(products.edit) → update + audit (before/after) + cache invalidation + ISR |
| `DELETE /api/portal/products/[id]` | DELETE | ✅ Real | requirePermission(products.delete) + credential elevation → soft delete + audit |
| `POST /api/portal/media/upload-url` | POST | ✅ Real | requirePermission(products.edit) → R2 signed upload URL |
| `GET /api/portal/orders` | GET | ✅ Real | requirePermission(orders.view_all) → paginated order list with search, status, payment filters |
| `PUT /api/portal/orders/[id]/status` | PUT | ✅ Real | requirePermission(orders.update_status) → state machine validation → update + history + audit |
| `POST /api/portal/orders/[id]/tracking` | POST | ✅ Real | requirePermission(orders.update_status) → create Shipment + set SHIPPED + history + audit |

### Finance APIs (Sprint 12 ✅)

| Route | Method | Status | What It Does |
|-------|--------|--------|-------------|
| `GET /api/portal/finance/revenue` | GET | ✅ Real | requirePermission(analytics.full) → advanced revenue analytics: time series (daily/weekly/monthly), period comparison (prev period/YoY), category breakdown, payment method split, AOV trends, top products |
| `GET /api/portal/finance/refunds` | GET | ✅ Real | requirePermission(refunds.view) → paginated refund list with status filters, search, status summary with aggregated amounts |
| `POST /api/portal/finance/refunds/[id]/process` | POST | ✅ Real | requirePermission(refunds.process) + credential gate if >₹5000 → ORIGINAL (Razorpay) or STORE_CREDIT (GiftCard creation) + order payment status update + audit |
| `GET /api/portal/finance/gst` | GET | ✅ Real | requirePermission(analytics.full) → monthly GST breakdown with CGST/SGST/IGST split (inter-state detection), effective rate, slab breakdown |
| `GET /api/portal/finance/export` | GET | ✅ Real | requirePermission(analytics.full) → CSV/JSON export (revenue/refunds/GST/orders) with date range, Content-Disposition headers, audit logged |

### Inventory APIs (Sprint 13 ✅)

| Route | Method | Status | What It Does |
|-------|--------|--------|-------------|
| `GET /api/portal/inventory` | GET | ✅ Real | requirePermission(inventory.view) → paginated stock list with low_stock/out_of_stock/overstocked filters, search, summary stats (totalSKUs, outOfStock, pendingPOs, suppliers) |
| `PUT /api/portal/inventory/[variantId]/adjust` | PUT | ✅ Real | requirePermission(inventory.adjust) → stock adjustment with StockAdjustment + InventoryMovement records + cache invalidation + ISR + audit |
| `GET /api/portal/inventory/movements` | GET | ✅ Real | requirePermission(inventory.view) → paginated movement history with variant/type/date filters |
| `GET /api/portal/inventory/purchase-orders` | GET | ✅ Real | requirePermission(inventory.view) → paginated PO list with status/supplier/search filters |
| `POST /api/portal/inventory/purchase-orders` | POST | ✅ Real | requirePermission(inventory.update) → create PO with items, auto PO-number, total cost computation + audit |
| `POST /api/portal/inventory/purchase-orders/[id]/receive` | POST | ✅ Real | requirePermission(inventory.update) → receive PO items, update inventory + movements, auto status transition (PARTIALLY_RECEIVED/RECEIVED) + audit |
| `GET/POST /api/portal/inventory/suppliers` | GET/POST | ✅ Real | requirePermission(inventory.view/update) → list/create suppliers with PO counts + audit |

### Offers APIs (Sprint 13 ✅)

| Route | Method | Status | What It Does |
|-------|--------|--------|-------------|
| `GET /api/portal/offers/coupons` | GET | ✅ Real | requirePermission(offers.view) → paginated coupons with active/inactive/expired filters, usage rates, aggregate stats |
| `POST /api/portal/offers/coupons` | POST | ✅ Real | requirePermission(offers.manage) + credential gate for >=40% discount → Zod → uniqueness check → create coupon + audit |
| `GET/PUT/DELETE /api/portal/offers/coupons/[id]` | ALL | ✅ Real | Detail view, update fields, soft-deactivate + audit |
| `GET /api/portal/offers/flash-sales` | GET | ✅ Real | requirePermission(offers.view) → paginated flash sales with upcoming/active/ended filters, sell-through rates, product details |
| `POST /api/portal/offers/flash-sales` | POST | ✅ Real | requirePermission(flash_sales.manage) + credential gate for >=40% discount → overlap validation → transaction create + audit + cache invalidation |
| `GET /api/portal/offers/dashboard` | GET | ✅ Real | requirePermission(offers.view) → real-time dashboard: active coupons, redemptions today, live flash sales with revenue, top coupons, bundles count |

### ML Engine (Sprint 14 ✅)

| Route | Method | Status | What It Does |
|-------|--------|--------|-------------|
| `GET /api/cron/compute-trending` | GET | ✅ Real | Cron-secret gated → hourly trending score computation from UserEvents with velocity (6h×1.5) + surge (1h×3.0) bonuses, batch upsert, score decay |
| `GET /api/ml/recommend` | GET | ✅ Real | Multi-strategy recommendation: Redis cache → ML service (3s timeout) → co-viewed fallback → category affinity → trending → newest. Context-aware (homepage/pdp/cart/category/search) |
| `GET /api/ml/analytics` | GET | ✅ Real | requirePermission(analytics.full) → ML system health, conversion funnel (view→cart→purchase rates), daily event time series, event distribution, top trending with per-product conversion |

### Utility Routes (PRODUCTION ✅)

| Route | Method | Status | What It Does |
|-------|--------|--------|-------------|
| `GET /api/health` | GET | ✅ Real | DB + Redis health check |
| `GET /api/revalidate` | GET | ✅ Real | ISR on-demand revalidation |
| `POST /api/events/track` | POST | ✅ Real | Zod validate → async DB insert (UserEvent) → always 202 |

---

## 6. SPRINT PROGRESS

| # | Name | Status |
|---|------|--------|
| 0 | Foundation & Database | ✅ Done |
| 1 | Auth System | ✅ Done |
| 2 | Design System + Layout | ✅ UI Done |
| 3 | Homepage | ✅ Done (UI + API wired to DB + Redis cache) |
| 4 | Product Listing + Search | ✅ Done (UI + API wired to DB with full filter/sort/pagination) |
| 5 | Product Detail | ✅ Done (UI + API wired to DB + Redis cache + stock calc + rating dist) |
| 6 | Cart + Checkout + Payments | ✅ Done (cart GET/POST/DELETE wired to DB + inventory check) |
| 7 | Customer Account | ✅ Done (orders + wishlist wired to DB with auth) |
| 8 | Portal Dashboard | ✅ Done (analytics summary wired to DB aggregates with permission) |
| 9 | Product Management | ✅ Done (CRUD API + slug gen + audit + credential gate for delete + R2 upload) |
| 10 | Order Management | ✅ Done (list + status update with state machine + tracking/shipment + audit) |
| 11 | CMS Portal | ✅ Done (homepage sections GET/PUT wired + audit + cache invalidation) |
| 12 | Finance Portal | ✅ Done (revenue analytics with time series/comparison/category/payment breakdown, refund processing with credential gate + store credit, GST with CGST/SGST/IGST, CSV/JSON export) |
| 13 | Inventory + Offers | ✅ Done (stock list/adjust/movements, PO CRUD with receive flow, suppliers, coupon CRUD with credential gate, flash sale CRUD with overlap validation, offers dashboard) |
| 14 | ML Engine | ✅ Done (trending cron with velocity+surge scoring, multi-strategy recommendations with co-viewed/affinity/trending fallbacks, ML analytics dashboard) |
| 15 | Plugins + Notifications | ✅ Done (plugin system lib + cache + PluginSlot component, plugin CRUD with credential gate, push subscription, storefront notifications with mark-as-read, Razorpay webhook with HMAC + idempotency, back-in-stock subscribe + notify, abandoned cart cron, cleanup events cron, back-in-stock cron) |

---

## 7. ARCHITECTURE RULES

1. **Every component calls an API** — no direct DB from React
2. **Schema is locked** — matches schema.prisma.txt exactly
3. **Clay Design System only** — all styles via Clay CSS vars + Tailwind
4. **Audit log every portal write** — `logAuditEntry()` on mutations
5. **Rate limit all auth** — Upstash ratelimit
6. **Employee lockout** — 5 fails → 15min Redis lock
7. **Credential elevation** — sensitive actions need password (5min TTL)
8. **Standardized responses** — `lib/api-response.ts` always
9. **JWT dual-token** — short access (cookie+header) + long refresh (HttpOnly)

---

## 8. NEXT STEPS

**All 58 API routes are production-ready (0 mock routes remain).**

### Sprint 15 Routes (Plugin System + Notifications)
- `GET /api/plugins/hooks` — return active plugin manifests for a hook name (Redis-cached)
- `GET /api/portal/plugins` — list all plugins with hooks (RBAC: plugins.manage)
- `PUT /api/portal/plugins/[id]/toggle` — activate/deactivate plugin + credential gate + audit
- `POST /api/notifications/subscribe` — Zod-validated push subscription upsert + UserPreferences
- `GET/PUT /api/storefront/notifications` — paginated notifications with unread count + mark-as-read
- `POST /api/payments/razorpay/webhook` — HMAC signature verify, idempotent via WebhookEvent, payment.captured/failed/refund processing
- `POST /api/storefront/back-in-stock` — customer subscribe for restock alerts
- `GET /api/portal/back-in-stock-requests` — list pending/notified requests with variant enrichment
- `POST /api/portal/back-in-stock-requests/notify` — send notifications + mark notified + audit
- `GET /api/cron/cleanup-events` — weekly cleanup of analytics events, search queries, webhooks >90 days
- `GET /api/cron/abandoned-cart` — hourly detection of stale carts >1h, creates AbandonedCart + user notifications
- `GET /api/cron/back-in-stock-notify` — auto-check restocked variants, create BACK_IN_STOCK notifications

### Infrastructure
- `lib/plugins.ts` — plugin manifest cache (Redis + in-memory), getActivePluginsForHook(), invalidatePluginCache()
- `components/shared/PluginSlot.tsx` — client component with dynamic lazy imports + Suspense
- Sidebar updated: Plugins link for SUPERADMIN + ADMIN roles

### Portal Sub-Pages (All API-wired ✅)

**Finance:**
- `/admin/finance` — Dashboard hub: revenue summary from API, 30-day sparkline chart, category revenue bars, quick links
- `/admin/finance/revenue` — Full analytics: KPI cards with growth %, bar chart with granularity toggle (daily/weekly/monthly), period selector (7d/30d/90d/12m/YTD), category/payment/top products panels
- `/admin/finance/refunds` — Refund table with status filter cards (PENDING/PROCESSING/COMPLETED/FAILED), search, process modal with ORIGINAL/STORE_CREDIT choice, credential gate for >₹5000
- `/admin/finance/export` — Report type selector (revenue/refunds/GST/orders), date range picker, CSV/JSON format toggle, download with proper Content-Disposition

**Inventory:**
- `/admin/inventory` — Dashboard hub: real stats from API (total SKUs, low stock, out of stock, pending POs, suppliers), low stock alert table
- `/admin/inventory/stock` — Full stock table with filter (all/low_stock/out_of_stock/overstocked), search, adjust modal with delta preview and reason selector
- `/admin/inventory/suppliers` — Supplier card grid with contact info, PO counts, create modal
- `/admin/inventory/purchase-orders` — PO table with status badges, search, status filters
- `/admin/inventory/movements` — Movement history table with type filters and color-coded quantities

**Offers:**
- `/admin/offers` — Dashboard hub: real stats from API, top performing coupons with usage bars, live flash sales with sell-through metrics
- `/admin/offers/coupons` — Coupon table with CRUD, status filters, usage rate bars, create modal with credential gate for ≥40% discount
- `/admin/offers/flash-sales` — Flash sale cards with live/upcoming/ended status, sell-through progress bars, countdown timers
- `/admin/offers/bundles` — Placeholder (Sprint 15)

### Sprint 16 — SEO, Security, Launch (✅ Done)

**SEO Metadata (generateMetadata):**
- `/product/[slug]/layout.tsx` — dynamic OG + Twitter cards from DB (metaTitle, metaDescription, primary image)
- `/category/[slug]/layout.tsx` — dynamic category metadata
- `/login/layout.tsx`, `/register/layout.tsx`, `/search/layout.tsx`, `/cart/layout.tsx`, `/checkout/layout.tsx` — static metadata
- `/admin/layout.tsx` — noindex for entire portal

**JSON-LD Structured Data:**
- Product pages: schema.org/Product with name, image, brand, offers (price + availability), aggregateRating

**Sitemap & Robots:**
- `app/sitemap.ts` — dynamic, includes all products + categories + static pages, force-dynamic
- `app/robots.ts` — allows /, disallows /admin/, /api/, /checkout, /account/

**Security Headers (next.config.mjs):**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-DNS-Prefetch-Control: on`
- API routes: `Cache-Control: no-store`
- `poweredByHeader: false`

**All 16 sprints are complete. The application is launch-ready.**
