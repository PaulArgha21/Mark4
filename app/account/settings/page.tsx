'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Globe, Save } from 'lucide-react'
import { staggerContainer, fadeUpVariants } from '@/lib/animations'
import { ClayButton } from '@/components/ui/ClayButton'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/storefront/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preferences: { emailNotifs, smsNotifs, pushNotifs },
        }),
      })
      if (res.ok) toast.success('Settings saved')
      else toast.error('Failed to save settings')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h2 variants={fadeUpVariants} className="font-display text-xl font-bold text-clay-text">
        Settings
      </motion.h2>

      {/* Notifications */}
      <motion.div variants={fadeUpVariants} className="clay-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-clay-rose" />
          <h3 className="font-semibold text-clay-text">Notifications</h3>
        </div>
        {[
          { label: 'Email notifications', desc: 'Order updates, promotions, and news', value: emailNotifs, set: setEmailNotifs },
          { label: 'SMS notifications', desc: 'Order status and delivery updates', value: smsNotifs, set: setSmsNotifs },
          { label: 'Push notifications', desc: 'Real-time alerts in your browser', value: pushNotifs, set: setPushNotifs },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-clay-text">{item.label}</p>
              <p className="text-xs text-clay-text-muted">{item.desc}</p>
            </div>
            <button
              onClick={() => item.set(!item.value)}
              className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? 'bg-clay-rose' : 'bg-clay-border'}`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.value ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        ))}
      </motion.div>

      {/* Preferences */}
      <motion.div variants={fadeUpVariants} className="clay-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-clay-rose" />
          <h3 className="font-semibold text-clay-text">Preferences</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-clay-text-secondary mb-1">Language</label>
            <select className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm">
              <option>English</option>
              <option>Hindi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-clay-text-secondary mb-1">Currency</label>
            <select className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-clay-sm px-3 py-2.5 text-sm">
              <option>INR (₹)</option>
              <option>USD ($)</option>
            </select>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUpVariants}>
        <ClayButton variant="primary" size="lg" onClick={handleSave} loading={saving}>
          <Save size={16} /> Save Settings
        </ClayButton>
      </motion.div>
    </motion.div>
  )
}
