'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Heart, MapPin, Pencil, X, Camera } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fadeUpVariants, staggerContainer } from '@/lib/animations'
import { ClayButton } from '@/components/ui/ClayButton'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

export default function AccountProfilePage() {
  const { user, mutate: mutateUser } = useAuth()
  const { data: accountStats } = useSWR('/api/storefront/account/stats', fetcher)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const startEditing = () => {
    setEditName(user?.name || '')
    setEditPhone(user?.phone || '')
    setEditing(true)
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/storefront/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() }),
      })
      if (!res.ok) throw new Error('Failed to update')
      mutateUser()
      setEditing(false)
      toast.success('Profile updated')
    } catch { toast.error('Failed to update profile') }
    finally { setSaving(false) }
  }

  const stats = [
    { label: 'Orders', value: String(accountStats?.orders ?? '—'), icon: Package, href: '/account/orders' },
    { label: 'Wishlist', value: String(accountStats?.wishlist ?? '—'), icon: Heart, href: '/account/wishlist' },
    { label: 'Addresses', value: String(accountStats?.addresses ?? '—'), icon: MapPin, href: '/account/addresses' },
  ]

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Card — Premium gradient with profile picture */}
      <motion.div variants={fadeUpVariants} className="relative overflow-hidden rounded-2xl p-5 md:p-7 text-white"
        style={{ background: 'linear-gradient(135deg, var(--clay-rose-dark), var(--clay-rose), var(--clay-rose-light))' }}>
        <div className="absolute w-32 h-32 rounded-full bg-white/10 blur-2xl -top-8 -right-8" />
        <div className="absolute w-20 h-20 rounded-full bg-white/8 blur-xl bottom-4 left-1/3" />
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-2">
            {/* Profile Picture — shows Google/Facebook avatar or fallback initial */}
            <div className="relative group">
              <div
                className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden ring-[3px] ring-white/30 shadow-lg"
                style={{ animation: 'ring-glow 3s ease-in-out infinite' }}
              >
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name || 'Profile'}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl md:text-2xl font-bold glass-frost">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={16} className="text-white" />
              </div>
            </div>
            <div>
              <h2 className="font-display text-lg md:text-xl font-bold">
                Welcome, {user?.name?.split(' ')[0] || 'there'}!
              </h2>
              <p className="text-white/60 text-[11px]">{user?.email}</p>
            </div>
          </div>
          <p className="text-white/70 mt-2 text-xs md:text-sm hidden md:block">
            Manage your account, track orders, and save your favorites.
          </p>
        </div>
      </motion.div>

      {/* Quick Stats — 3D hover cards */}
      <motion.div variants={fadeUpVariants} className="grid grid-cols-3 gap-2.5 md:gap-3">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <motion.div
              className="clay-card p-3 md:p-4 text-center group cursor-pointer rounded-2xl"
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-clay-blush mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon size={18} className="text-clay-rose md:w-5 md:h-5" />
              </div>
              <p className="font-display text-lg md:text-xl font-bold text-clay-text">{value}</p>
              <p className="text-[9px] md:text-[10px] text-clay-text-muted font-medium uppercase tracking-wider mt-0.5">{label}</p>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      {/* Profile Details */}
      <motion.div variants={fadeUpVariants} className="clay-card p-4 md:p-6 space-y-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-clay-text">Profile Details</h3>
          {!editing && (
            <button onClick={startEditing} className="flex items-center gap-1.5 text-xs text-clay-rose hover:text-clay-rose-dark font-semibold transition-colors">
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-clay-text-muted uppercase tracking-wider mb-1">Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose/50" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-clay-text-muted uppercase tracking-wider mb-1">Phone</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-clay-text-muted pointer-events-none select-none">🇮🇳 +91</span>
                <input value={editPhone} onChange={e => { let v = e.target.value.replace(/[^\d]/g, ''); if (v.startsWith('91') && v.length > 10) v = v.slice(2); if (v.length <= 10) setEditPhone(v) }} maxLength={10} className="w-full bg-clay-bg-sunken border border-clay-border-light rounded-xl pl-[4.5rem] pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay-rose/50" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-clay-text-muted uppercase tracking-wider mb-1">Email</label>
              <p className="text-sm text-clay-text-secondary">{user?.email || '—'} <span className="text-[10px] text-clay-text-muted">(cannot be changed)</span></p>
            </div>
            <div className="flex gap-2 pt-1">
              <ClayButton variant="primary" size="sm" onClick={handleSaveProfile} loading={saving} className="!rounded-xl">Save</ClayButton>
              <ClayButton variant="ghost" size="sm" onClick={() => setEditing(false)} className="!rounded-xl">
                <X size={14} /> Cancel
              </ClayButton>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: 'Name', value: user?.name || '—' },
              { label: 'Email', value: user?.email || '—' },
              { label: 'Phone', value: user?.phone ? `+91 ${user.phone}` : '—' },
              { label: 'Member Since', value: accountStats?.memberSince ? new Date(accountStats.memberSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—' },
            ].map(item => (
              <div key={item.label} className="p-3 bg-clay-bg-sunken/50 rounded-xl">
                <p className="text-[10px] text-clay-text-muted font-semibold uppercase tracking-wider mb-0.5">{item.label}</p>
                <p className="text-sm font-medium text-clay-text">{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
