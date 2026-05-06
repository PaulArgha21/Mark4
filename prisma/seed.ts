import { PrismaClient, EmployeeRole } from '@prisma/client'

const db = new PrismaClient()

const PERMISSIONS = [
  { key: 'system.settings', category: 'System' },
  { key: 'system.plugins', category: 'System' },
  { key: 'employees.create', category: 'Employees' },
  { key: 'employees.delete', category: 'Employees' },
  { key: 'employees.view', category: 'Employees' },
  { key: 'audit_logs.view', category: 'System' },
  { key: 'products.create', category: 'Products' },
  { key: 'products.edit', category: 'Products' },
  { key: 'products.delete', category: 'Products' },
  { key: 'products.view', category: 'Products' },
  { key: 'categories.manage', category: 'Products' },
  { key: 'collections.manage', category: 'Products' },
  { key: 'inventory.view', category: 'Inventory' },
  { key: 'inventory.update', category: 'Inventory' },
  { key: 'inventory.adjust', category: 'Inventory' },
  { key: 'suppliers.manage', category: 'Inventory' },
  { key: 'purchase_orders.manage', category: 'Inventory' },
  { key: 'orders.view_all', category: 'Orders' },
  { key: 'orders.update_status', category: 'Orders' },
  { key: 'orders.cancel', category: 'Orders' },
  { key: 'refunds.view', category: 'Finance' },
  { key: 'refunds.process', category: 'Finance' },
  { key: 'customers.view', category: 'Customers' },
  { key: 'customers.block', category: 'Customers' },
  { key: 'finance.revenue', category: 'Finance' },
  { key: 'finance.export', category: 'Finance' },
  { key: 'finance.gst', category: 'Finance' },
  { key: 'cms.banners', category: 'CMS' },
  { key: 'cms.homepage', category: 'CMS' },
  { key: 'cms.collections', category: 'CMS' },
  { key: 'cms.blog', category: 'CMS' },
  { key: 'cms.stories', category: 'CMS' },
  { key: 'reviews.moderate', category: 'CMS' },
  { key: 'coupons.create', category: 'Offers' },
  { key: 'coupons.delete', category: 'Offers' },
  { key: 'promotions.manage', category: 'Offers' },
  { key: 'flash_sales.manage', category: 'Offers' },
  { key: 'bundles.manage', category: 'Offers' },
  { key: 'analytics.full', category: 'Analytics' },
  { key: 'analytics.marketing', category: 'Analytics' },
  { key: 'analytics.ops', category: 'Analytics' },
  { key: 'analytics.offers', category: 'Analytics' },
]

async function main() {
  // Create permissions
  for (const p of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    })
  }

  // Create SUPERADMIN employee (OTP-based login, no password needed)
  await db.employee.upsert({
    where: { email: 'Arghap46@gmail.com' },
    update: { role: EmployeeRole.SUPERADMIN, isActive: true },
    create: {
      email:        'Arghap46@gmail.com',
      passwordHash: '', // OTP-based auth — no password needed
      name:         'Argha P',
      role:         EmployeeRole.SUPERADMIN,
      isActive:     true,
    }
  })

  // Create default SiteSetting
  const existingSetting = await db.siteSetting.findFirst()
  if (!existingSetting) {
    await db.siteSetting.create({
      data: {
        siteName:     'Aprdite',
        tagline:      'Dress the dream.',
        primaryColor: '#F2C4CE',
        metaTitle:    'Aprdite — Curated Fashion',
      }
    })
  }

  // Seed all HomepageSection types with defaults
  const sectionTypes = [
    'HERO_BANNERS','STORY_BANNERS','CATEGORIES','TOP_PICKS',
    'TRENDING','NEW_ARRIVALS','FEATURED_PRODUCTS','PROMO_CARDS',
    'GALLERY','FLASH_SALE','FOR_YOU','COLLECTIONS'
  ] as const

  for (let i = 0; i < sectionTypes.length; i++) {
    await db.homepageSection.upsert({
      where: { type: sectionTypes[i] },
      update: {},
      create: { type: sectionTypes[i], isVisible: true, sortOrder: i }
    })
  }

  console.log('✅ Seed complete')
}

main().catch(console.error).finally(() => db.$disconnect())
