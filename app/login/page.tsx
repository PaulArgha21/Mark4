'use client'
import { useState, Suspense, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, ArrowLeft, Smartphone, Mail, Loader2 } from 'lucide-react'
import { ClayButton } from '@/components/ui/ClayButton'
import { useAuth } from '@/hooks/useAuth'
import { fadeUpVariants, staggerContainer } from '@/lib/animations'
import { AprditeLogoIcon } from '@/components/shared/AprditeLogo'
import { toast } from 'sonner'

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (cfg: unknown) => void; renderButton: (el: HTMLElement | null, cfg: unknown) => void; prompt?: (cb?: unknown) => void } } }
    FB?: { init: (cfg: unknown) => void; login: (cb: (res: { authResponse?: { accessToken: string } }) => void, opts: unknown) => void }
    fbAsyncInit?: () => void
  }
}

type Step = 'identifier' | 'password' | 'otp'

function isPhone(value: string) {
  const cleaned = value.replace(/[\s\-()]/g, '').replace(/^\+91/, '')
  return /^\d{10}$/.test(cleaned)
}
function cleanPhone(value: string) {
  return value.replace(/[\s\-()]/g, '').replace(/^\+91/, '')
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-clay-bg-base" />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { login, mutate } = useAuth()

  const [step, setStep] = useState<Step>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return
    const t = setTimeout(() => setOtpCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [otpCountdown])

  // Google One Tap / Sign-In callback
  const handleGoogleCallback = useCallback(async (response: { credential: string }) => {
    setSocialLoading('google')
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Google login failed')
      await mutate()
      toast.success('Welcome!')
      window.location.replace(redirect)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google login failed'
      toast.error(msg)
    } finally {
      setSocialLoading(null)
    }
  }, [mutate, redirect])

  // Initialize Google Sign-In
  useEffect(() => {
    if (!googleClientId || typeof window === 'undefined') return
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval)
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback,
        })
        window.google.accounts.id.renderButton(
          document.getElementById('google-btn-hidden'),
          { theme: 'outline', size: 'large', width: 280, text: 'continue_with', shape: 'pill' }
        )
      }
    }, 200)
    return () => clearInterval(interval)
  }, [googleClientId, handleGoogleCallback])

  // Facebook login handler
  const handleFacebookLogin = async () => {
    if (!window.FB) { toast.error('Facebook SDK not loaded'); return }
    setSocialLoading('facebook')
    window.FB.login(async (response) => {
      if (!response.authResponse?.accessToken) {
        setSocialLoading(null)
        return
      }
      try {
        const res = await fetch('/api/auth/facebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ accessToken: response.authResponse.accessToken }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || 'Facebook login failed')
        await mutate()
        toast.success('Welcome!')
        window.location.replace(redirect)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Facebook login failed'
        toast.error(msg)
      } finally {
        setSocialLoading(null)
      }
    }, { scope: 'email,public_profile' })
  }

  // Initialize Facebook SDK
  useEffect(() => {
    if (!facebookAppId) return
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: facebookAppId, cookie: true, xfbml: true, version: 'v19.0' })
    }
  }, [facebookAppId])

  // Step 1 → detect email or phone → go to step 2
  const handleContinue = async () => {
    const val = identifier.trim()
    if (!val) { toast.error('Enter your email or phone'); return }

    if (isPhone(val)) {
      // Phone flow → send OTP to registered email
      setOtpSending(true)
      try {
        const res = await fetch('/api/auth/otp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone(val) }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message || 'Failed to send OTP')
        setMaskedEmail(data.data?.maskedEmail || '')
        toast.success(data.data?.message || 'OTP sent to your registered email')
        setOtp(['', '', '', '', '', ''])
        setOtpCountdown(30)
        setStep('otp')
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to send OTP')
      } finally {
        setOtpSending(false)
      }
    } else {
      // Email flow → show password
      setStep('password')
    }
  }

  // Email + password submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(identifier.trim(), password)
      toast.success('Welcome back!')
      window.location.replace(redirect)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // OTP verify (button handler)
  const handleOtpVerify = () => {
    const code = otp.join('')
    if (code.length !== 6) { toast.error('Enter complete 6-digit OTP'); return }
    verifyOtpCode(code)
  }

  // OTP verify with explicit code (avoids stale closure)
  const verifyOtpCode = async (code: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: cleanPhone(identifier), otp: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'OTP verification failed')
      await mutate()
      toast.success('Welcome back!')
      window.location.replace(redirect)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  // OTP input handler
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    // Auto-submit when all 6 digits entered
    const code = newOtp.join('')
    if (code.length === 6) setTimeout(() => verifyOtpCode(code), 150)
  }
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return
    setOtpSending(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone(identifier) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to resend')
      toast.success('New OTP sent to your email')
      setOtp(['', '', '', '', '', ''])
      setOtpCountdown(30)
      otpRefs.current[0]?.focus()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend')
    } finally {
      setOtpSending(false)
    }
  }

  const goBack = () => {
    setStep('identifier')
    setPassword('')
    setOtp(['', '', '', '', '', ''])
  }

  const inputClass = 'w-full rounded-2xl px-4 py-3.5 text-sm transition-all focus:outline-none focus:ring-2 bg-clay-bg-surface border border-clay-border focus:ring-clay-rose/50 focus:border-clay-rose text-clay-text placeholder:text-clay-text-muted'

  return (
    <div className="min-h-screen bg-clay-bg-base flex relative overflow-hidden">
      {/* Google Identity Services SDK */}
      {googleClientId && (
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      )}
      {/* Facebook SDK */}
      {facebookAppId && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          async
          defer
          crossOrigin="anonymous"
        />
      )}

      {/* Floating decoration orbs — clay theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-72 h-72 rounded-full bg-clay-rose/[0.04] blur-3xl -top-20 -right-20" style={{ animation: 'float-slow 8s ease-in-out infinite' }} />
        <div className="absolute w-56 h-56 rounded-full bg-clay-butter/[0.06] blur-3xl bottom-10 -left-10" style={{ animation: 'float-slow 10s ease-in-out infinite 3s' }} />
        <div className="absolute w-40 h-40 rounded-full bg-clay-sage/[0.03] blur-2xl top-1/3 left-1/4" style={{ animation: 'float-slow 7s ease-in-out infinite 1.5s' }} />
      </div>

      {/* Watermark logo behind the form */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 lg:left-[45%]">
        <img
          src="/mylogo.png"
          alt=""
          className="w-[300px] h-[300px] md:w-[380px] md:h-[380px] object-contain opacity-[0.04]"
          draggable={false}
        />
      </div>

      {/* ═══════ DESKTOP: Left Brand Panel ═══════ */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(135deg, var(--clay-rose-dark), var(--clay-rose), var(--clay-rose-light))' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
        <div className="absolute w-64 h-64 rounded-full bg-white/10 blur-3xl top-10 -left-20" style={{ animation: 'float-slow 8s ease-in-out infinite' }} />
        <div className="absolute w-48 h-48 rounded-full bg-white/8 blur-2xl bottom-20 right-10" style={{ animation: 'float-slow 10s ease-in-out infinite 2s' }} />
        <motion.div
          className="relative z-10 text-center text-white p-12 max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUpVariants} className="mx-auto mb-6">
            <img src="/mylogo.png" alt="Aprdite" className="w-28 h-28 mx-auto object-contain drop-shadow-2xl" draggable={false} />
          </motion.div>
          <motion.h1 variants={fadeUpVariants} className="font-display text-5xl font-bold mb-4">Aprdite</motion.h1>
          <motion.p variants={fadeUpVariants} className="text-lg text-white/75 leading-relaxed">
            Curated fashion for the modern soul.<br />Welcome back.
          </motion.p>
          <motion.div variants={fadeUpVariants} className="flex items-center justify-center gap-6 mt-10 text-white/40 text-xs font-medium">
            <span>Premium Quality</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Free Returns</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>Secure Checkout</span>
          </motion.div>
        </motion.div>
      </div>

      {/* ═══════ RIGHT / MOBILE: Login Form ═══════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 md:px-8 md:py-12 relative z-10">
        <motion.div
          className="w-full max-w-[400px]"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Brand Header */}
          <motion.div variants={fadeUpVariants} className="text-center mb-8">
            <Link href="/">
              <motion.div
                className="mx-auto mb-4 w-fit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AprditeLogoIcon size={56} />
              </motion.div>
            </Link>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-clay-text">
              {step === 'identifier' ? 'Welcome back' : step === 'password' ? 'Enter your password' : 'Verify your identity'}
            </h1>
            <p className="text-sm text-clay-text-muted mt-1.5">
              {step === 'identifier' && 'Sign in with your email or phone number'}
              {step === 'password' && (
                <span className="flex items-center justify-center gap-1.5">
                  <Mail size={13} />
                  {identifier}
                </span>
              )}
              {step === 'otp' && (
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} />
                    OTP sent to {maskedEmail || 'your email'}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-clay-text-muted/70">
                    <Smartphone size={11} />
                    +91 {cleanPhone(identifier).slice(0, 2)}****{cleanPhone(identifier).slice(-2)}
                  </span>
                </span>
              )}
            </p>
          </motion.div>

          {/* Card */}
          <motion.div
            variants={fadeUpVariants}
            className="bg-clay-bg-elevated rounded-3xl p-6 shadow-lg border border-clay-border/50"
          >
            {/* Hidden Google SDK button */}
            {googleClientId && <div id="google-btn-hidden" className="hidden" />}

            <AnimatePresence mode="wait">
              {/* ─── STEP 1: Identifier ─── */}
              {step === 'identifier' && (
                <motion.div
                  key="step-id"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Social Login — round buttons */}
                  {(googleClientId || facebookAppId) && (
                    <>
                      <div className="flex items-center justify-center gap-4">
                        {googleClientId && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.querySelector<HTMLDivElement>('#google-btn-hidden div[role=button]')
                              if (el) el.click()
                              else window.google?.accounts?.id?.prompt?.()
                            }}
                            disabled={socialLoading === 'google'}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 border border-clay-border bg-clay-bg-surface hover:bg-clay-bg-sunken shadow-sm"
                            title="Continue with Google"
                          >
                            <svg viewBox="0 0 24 24" className="w-5 h-5">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                          </button>
                        )}
                        {facebookAppId && (
                          <button
                            type="button"
                            onClick={handleFacebookLogin}
                            disabled={socialLoading === 'facebook'}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-50 border border-clay-border bg-clay-bg-surface hover:bg-clay-bg-sunken shadow-sm"
                            title="Continue with Facebook"
                          >
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-clay-border" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-clay-text-muted">Or</span>
                        <div className="flex-1 h-px bg-clay-border" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-clay-text-secondary mb-1.5 uppercase tracking-wider">
                      Email or Phone Number
                    </label>
                    <div className="relative">
                      {/* Show +91 prefix when input looks like a phone number */}
                      {/^\d/.test(identifier) && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-clay-text-muted pointer-events-none select-none">
                          🇮🇳 +91
                        </span>
                      )}
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => {
                          let val = e.target.value
                          // Strip +91 if pasted
                          if (val.startsWith('+91')) val = val.slice(3).trim()
                          setIdentifier(val)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
                        placeholder="you@example.com or 98765 43210"
                        className={inputClass + (/^\d/.test(identifier) ? ' pl-[4.5rem]' : '')}
                        autoFocus
                      />
                    </div>
                  </div>

                  <ClayButton
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={otpSending}
                    onClick={handleContinue}
                    className="!rounded-2xl"
                  >
                    Continue <ArrowRight size={18} />
                  </ClayButton>
                </motion.div>
              )}

              {/* ─── STEP 2A: Password (email) ─── */}
              {step === 'password' && (
                <motion.div
                  key="step-pw"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-clay-text-secondary mb-1.5 uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className={inputClass + ' pr-11'}
                          autoFocus
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-clay-text-muted hover:text-clay-text transition-colors"
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs text-clay-text-muted hover:text-clay-text font-medium transition-colors">
                        <ArrowLeft size={13} /> Change email
                      </button>
                      <Link href="/forgot-password" className="text-xs text-clay-rose hover:text-clay-rose-dark font-semibold transition-colors">
                        Forgot password?
                      </Link>
                    </div>

                    <ClayButton
                      type="submit"
                      variant="primary"
                      size="lg"
                      fullWidth
                      loading={loading}
                      className="!rounded-2xl !mt-5"
                    >
                      Sign In <ArrowRight size={18} />
                    </ClayButton>
                  </form>
                </motion.div>
              )}

              {/* ─── STEP 2B: OTP (phone) ─── */}
              {step === 'otp' && (
                <motion.div
                  key="step-otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-semibold text-clay-text-secondary mb-3 uppercase tracking-wider text-center">
                      Enter 6-digit OTP
                    </label>
                    <div className="flex items-center justify-center gap-2.5">
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
                          className="w-11 h-12 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl border border-clay-border bg-clay-bg-surface focus:border-clay-rose focus:ring-2 focus:ring-clay-rose/50 focus:outline-none text-clay-text transition-all"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button type="button" onClick={goBack} className="flex items-center gap-1 text-xs text-clay-text-muted hover:text-clay-text font-medium transition-colors">
                      <ArrowLeft size={13} /> Change number
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpCountdown > 0 || otpSending}
                      className="text-xs font-semibold transition-colors disabled:text-clay-text-muted text-clay-rose hover:text-clay-rose-dark"
                    >
                      {otpSending ? (
                        <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Sending...</span>
                      ) : otpCountdown > 0 ? (
                        `Resend in ${otpCountdown}s`
                      ) : (
                        'Resend OTP'
                      )}
                    </button>
                  </div>

                  <ClayButton
                    type="button"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    onClick={handleOtpVerify}
                    className="!rounded-2xl"
                  >
                    Verify & Sign In <ArrowRight size={18} />
                  </ClayButton>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.p
            variants={fadeUpVariants}
            className="text-center text-sm mt-6 text-clay-text-muted"
          >
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-clay-rose hover:text-clay-rose-dark transition-colors">
              Create Account
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
