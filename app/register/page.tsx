'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { useAuth } from '@/hooks/useAuth'
import { springs, fadeUpVariants, staggerContainer } from '@/lib/animations'
import { AprditeLogoIcon } from '@/components/shared/AprditeLogo'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await register(name, email, phone, password)
      toast.success('Account created successfully!')
      window.location.replace('/')
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-clay-bg-base flex">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 clay-gradient-rose relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-clay-rose-dark/30 to-transparent" />
        <motion.div
          className="relative z-10 text-center text-white p-12 max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUpVariants} className="mx-auto mb-6">
            <img src="/mylogo.png" alt="Aprdite" className="w-28 h-28 mx-auto object-contain drop-shadow-2xl" draggable={false} />
          </motion.div>
          <motion.h1 variants={fadeUpVariants} className="font-display text-5xl font-bold mb-4">
            Join Aprdite
          </motion.h1>
          <motion.p variants={fadeUpVariants} className="text-lg text-white/80">
            Create your account and discover curated fashion pieces designed for you.
          </motion.p>
        </motion.div>
      </div>

      {/* Right — Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUpVariants} className="mb-8">
            <Link href="/" className="lg:hidden flex items-center gap-2 mb-1">
              <AprditeLogoIcon size={40} />
              <span className="font-display text-3xl font-bold text-clay-rose">Aprdite</span>
            </Link>
            <h2 className="font-display text-2xl font-bold text-clay-text mt-4 lg:mt-0">
              Create Account
            </h2>
            <p className="text-sm text-clay-text-muted mt-1">
              Join us for exclusive access to curated collections
            </p>
          </motion.div>

          <motion.form variants={fadeUpVariants} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-clay-text mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-clay-bg-surface border border-clay-border rounded-clay-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose focus:border-transparent transition-all shadow-clay-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-clay-text mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-clay-bg-surface border border-clay-border rounded-clay-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose focus:border-transparent transition-all shadow-clay-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-clay-text mb-1.5">Phone</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-clay-text-muted pointer-events-none select-none">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d]/g, '')
                    if (val.startsWith('91') && val.length > 10) val = val.slice(2)
                    if (val.length <= 10) setPhone(val)
                  }}
                  placeholder="98765 43210"
                  maxLength={10}
                  className="w-full bg-clay-bg-surface border border-clay-border rounded-clay-md pl-[4.5rem] pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose focus:border-transparent transition-all shadow-clay-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-clay-text mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-clay-bg-surface border border-clay-border rounded-clay-md px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose focus:border-transparent transition-all shadow-clay-sm"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-clay-text-muted hover:text-clay-text"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <ClayButton type="submit" variant="primary" size="lg" fullWidth loading={loading} className="!mt-6">
              Create Account <ArrowRight size={18} />
            </ClayButton>
          </motion.form>

          <motion.p variants={fadeUpVariants} className="text-center text-sm text-clay-text-muted mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-clay-rose hover:text-clay-rose-dark font-semibold">
              Sign In
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
