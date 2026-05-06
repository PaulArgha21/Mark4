'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { motion } from 'framer-motion'
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { fadeUpVariants, staggerContainer } from '@/lib/animations'

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MARKETING: 'Marketing',
  FINANCE: 'Finance',
  OPERATIONS: 'Operations',
  OFFERS: 'Offers',
}

const ROLE_HOME: Record<string, string> = {
  SUPERADMIN: '/admin/dashboard',
  ADMIN: '/admin/dashboard',
  MARKETING: '/admin/cms',
  FINANCE: '/admin/finance',
  OPERATIONS: '/admin/inventory',
  OFFERS: '/admin/offers',
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--portal-bg)' }} />}>
      <AccessDeniedContent />
    </Suspense>
  )
}

function AccessDeniedContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/admin'
  const role = searchParams.get('role') || 'UNKNOWN'
  const roleLabel = ROLE_LABELS[role] || role
  const homePath = ROLE_HOME[role] || '/admin/dashboard'

  const handleLogout = async () => {
    await fetch('/api/employee/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/admin/login')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--portal-bg)' }}
    >
      <motion.div
        className="w-full max-w-md text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUpVariants}>
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(214, 51, 108, 0.1)', border: '2px solid rgba(214, 51, 108, 0.2)' }}
          >
            <ShieldX size={40} style={{ color: '#d6336c' }} />
          </div>
        </motion.div>

        <motion.div variants={fadeUpVariants}>
          <h1
            className="font-display text-3xl font-bold mb-3"
            style={{ color: 'var(--portal-text)' }}
          >
            Access Denied
          </h1>
          <p className="text-base mb-2" style={{ color: 'var(--portal-muted)' }}>
            You don&apos;t have permission to access this page.
          </p>
          <div
            className="inline-block px-4 py-2 rounded-xl text-sm font-medium mb-6"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', color: 'var(--portal-text)' }}
          >
            Your role: <strong>{roleLabel}</strong>
          </div>
          <p className="text-sm mb-8" style={{ color: 'var(--portal-muted)' }}>
            The page <code className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--portal-surface)', color: 'var(--portal-accent)' }}>{from}</code> requires
            higher privileges. Contact your administrator if you need access.
          </p>
        </motion.div>

        <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-3 justify-center">
          <ClayButton
            variant="primary"
            size="lg"
            onClick={() => router.push(homePath)}
          >
            <ArrowLeft size={18} /> Go to My Dashboard
          </ClayButton>
          <ClayButton
            variant="outline"
            size="lg"
            onClick={handleLogout}
          >
            <LogOut size={18} /> Sign Out
          </ClayButton>
        </motion.div>
      </motion.div>
    </div>
  )
}
