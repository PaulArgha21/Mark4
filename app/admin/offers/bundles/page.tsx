'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Gift } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'

export default function BundlesPage() {
  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center gap-3">
          <Link href="/admin/offers" className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--portal-muted)' }}><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Product Bundles</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Create and manage bundle deals</p>
          </div>
        </motion.div>

        <motion.div variants={fadeUpVariants} className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: 'var(--portal-surface)', border: '1px dashed var(--portal-border)' }}>
          <Gift size={48} style={{ color: 'var(--portal-muted)' }} />
          <h3 className="font-display text-lg font-bold mt-4" style={{ color: 'var(--portal-text)' }}>Bundle Management</h3>
          <p className="text-sm mt-1 max-w-md text-center" style={{ color: 'var(--portal-muted)' }}>
            Bundle CRUD is planned for Sprint 15. The Bundle model is ready in the schema — this page will allow creating product bundles with custom pricing, discount rules, and inventory linking.
          </p>
        </motion.div>
      </motion.div>
    </PortalShell>
  )
}
