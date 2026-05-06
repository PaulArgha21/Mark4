'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ClayButton } from '@/components/ui/ClayButton'
import { springs } from '@/lib/animations'

interface CredentialGateProps {
  action: string
  onSuccess: () => void
  onCancel: () => void
}

export function CredentialGate({ action, onSuccess, onCancel }: CredentialGateProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const verify = async () => {
    if (!password.trim()) { setError('Password required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/employee/auth/verify-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        setError('Incorrect password. Try again.')
        setPassword('')
      }
    } catch {
      setError('Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springs.bouncy}
    >
      <div className="text-center">
        <div className="text-4xl mb-3">🔐</div>
        <h3 className="text-lg font-bold" style={{ color: 'var(--portal-text)' }}>
          Credential Verification Required
        </h3>
        <p className="text-sm mt-1" style={{ color: 'var(--portal-muted)' }}>
          Enter your password to {action}
        </p>
      </div>

      <input
        type="password"
        placeholder="Your password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && verify()}
        autoFocus
        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]"
        style={{
          background: 'var(--portal-elevated)',
          border: '1px solid var(--portal-border)',
          color: 'var(--portal-text)',
        }}
      />

      {error && (
        <motion.p
          className="text-sm text-center"
          style={{ color: 'var(--clay-error)' }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}

      <div className="flex gap-3">
        <ClayButton variant="ghost" fullWidth onClick={onCancel}>Cancel</ClayButton>
        <ClayButton variant="primary" fullWidth onClick={verify} loading={loading}>
          Verify & Proceed
        </ClayButton>
      </div>
    </motion.div>
  )
}
