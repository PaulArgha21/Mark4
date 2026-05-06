'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldX, ArrowLeft, LogIn } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { fadeUpVariants, staggerContainer } from '@/lib/animations'
import { StorefrontShell } from '@/components/storefront/layout/StorefrontShell'

export default function CustomerAccessDeniedPage() {
  const router = useRouter()

  return (
    <StorefrontShell>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          className="w-full max-w-md text-center"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUpVariants}>
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-clay-surface border-2 border-clay-border">
              <ShieldX size={40} className="text-clay-accent" />
            </div>
          </motion.div>

          <motion.div variants={fadeUpVariants}>
            <h1 className="font-display text-3xl font-bold text-clay-text mb-3">
              Access Denied
            </h1>
            <p className="text-clay-text-muted mb-8">
              You need to sign in to access this page.
            </p>
          </motion.div>

          <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-3 justify-center">
            <ClayButton variant="primary" size="lg" onClick={() => router.push('/login')}>
              <LogIn size={18} /> Sign In
            </ClayButton>
            <ClayButton variant="outline" size="lg" onClick={() => router.push('/')}>
              <ArrowLeft size={18} /> Back to Home
            </ClayButton>
          </motion.div>
        </motion.div>
      </div>
    </StorefrontShell>
  )
}
