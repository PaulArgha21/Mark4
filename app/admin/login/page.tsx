'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { fadeUpVariants, staggerContainer, springs } from '@/lib/animations'
import { toast } from 'sonner'

type Step = 'email' | 'otp'

export default function AdminLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first OTP input when step changes
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }, [step])

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch('/api/employee/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send OTP')
      setEmployeeName(data.data?.name || '')
      setStep('otp')
      toast.success('OTP sent to your email!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every(d => d)) {
      handleVerifyOTP(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newOtp = pasted.split('')
      setOtp(newOtp)
      otpRefs.current[5]?.focus()
      handleVerifyOTP(pasted)
    }
  }

  const handleVerifyOTP = async (otpValue?: string) => {
    const code = otpValue || otp.join('')
    if (code.length !== 6) { toast.error('Enter all 6 digits'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/employee/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Invalid OTP')
      toast.success(`Welcome, ${data.data?.employee?.name || 'Admin'}!`)
      router.push('/admin/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      toast.error(message)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/employee/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to resend')
      }
      toast.success('New OTP sent!')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--portal-bg)' }}
    >
      <motion.div
        className="w-full max-w-sm"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUpVariants} className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
          >
            {step === 'email' ? (
              <Mail size={24} style={{ color: 'var(--portal-accent)' }} />
            ) : (
              <ShieldCheck size={24} style={{ color: 'var(--portal-accent)' }} />
            )}
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>
            Employee Portal
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
            {step === 'email' ? 'Enter your work email to receive a login code' : `Enter the 6-digit code sent to ${email}`}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'email' ? (
            <motion.form
              key="email-step"
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendOTP}
              className="space-y-4 p-6 rounded-2xl"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
            >
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--portal-muted)' }}>
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@aprdite.com"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]"
                  style={{
                    background: 'var(--portal-elevated)',
                    border: '1px solid var(--portal-border)',
                    color: 'var(--portal-text)',
                  }}
                  required
                  autoFocus
                />
              </div>

              <ClayButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                Send Login Code <ArrowRight size={18} />
              </ClayButton>
            </motion.form>
          ) : (
            <motion.div
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springs.gentle}
              className="space-y-4 p-6 rounded-2xl"
              style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
            >
              {employeeName && (
                <p className="text-sm text-center" style={{ color: 'var(--portal-text)' }}>
                  Hello, <strong>{employeeName}</strong>
                </p>
              )}

              <div>
                <label className="block text-xs font-medium mb-3 text-center" style={{ color: 'var(--portal-muted)' }}>
                  Verification Code
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]"
                      style={{
                        background: 'var(--portal-elevated)',
                        border: '1px solid var(--portal-border)',
                        color: 'var(--portal-text)',
                      }}
                    />
                  ))}
                </div>
              </div>

              <ClayButton
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onClick={() => handleVerifyOTP()}
              >
                Verify & Sign In <ShieldCheck size={18} />
              </ClayButton>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']) }}
                  className="text-xs flex items-center gap-1 hover:underline"
                  style={{ color: 'var(--portal-muted)' }}
                >
                  <ArrowLeft size={12} /> Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--portal-accent)' }}
                >
                  Resend code
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
