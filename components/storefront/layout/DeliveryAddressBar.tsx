'use client'
import { MapPin, ChevronDown, Truck, Zap, Sparkles } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import { useAuth } from '@/hooks/useAuth'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

interface Address {
  id: string
  fullName: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  isDefault: boolean
}

interface DeliveryEstimate {
  isServiceable: boolean
  minDays: number
  maxDays: number
  deliveryDateMin: string
  deliveryDateMax: string
  shippingCost: number
  freeShippingAbove: number | null
  zoneName: string
  deliveryNote?: string
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

export function DeliveryAddressBar() {
  const { isAuthenticated } = useAuth()
  const { data: addresses } = useSWR<Address[]>(
    isAuthenticated ? '/api/storefront/addresses' : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const defaultAddr = addresses?.find(a => a.isDefault) || addresses?.[0]
  const pincode = defaultAddr?.postalCode

  const { data: estimate } = useSWR<DeliveryEstimate>(
    pincode ? `/api/storefront/delivery-estimate?pincode=${pincode}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-4 h-10 md:hidden backdrop-blur-xl bg-white/30 dark:bg-clay-bg-base/30"
      >
        <Zap size={13} className="text-amber-500 flex-shrink-0" fill="currentColor" />
        <span className="text-xs font-bold truncate" style={{ background: 'linear-gradient(90deg, #e84393, #fd79a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Sign in for fastest delivery
        </span>
        <ChevronDown size={12} className="text-clay-text-muted/60 flex-shrink-0 ml-auto" />
      </Link>
    )
  }

  if (!defaultAddr) {
    return (
      <Link
        href="/account/addresses"
        className="flex items-center gap-2 px-4 h-10 md:hidden backdrop-blur-xl bg-white/30 dark:bg-clay-bg-base/30"
      >
        <Sparkles size={13} className="text-violet-500 flex-shrink-0" />
        <span className="text-xs font-bold" style={{ background: 'linear-gradient(90deg, #6c5ce7, #a29bfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Add address for express delivery
        </span>
        <ChevronDown size={12} className="text-clay-text-muted/60 flex-shrink-0 ml-auto" />
      </Link>
    )
  }

  const shortAddr = `${defaultAddr.city}, ${defaultAddr.postalCode}`

  return (
    <Link
      href="/account/addresses"
      className="flex items-center gap-2 px-4 h-10 md:hidden backdrop-blur-xl bg-white/30 dark:bg-clay-bg-base/30 active:bg-white/40 transition-colors"
    >
      <MapPin size={14} className="text-clay-rose flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ background: 'linear-gradient(90deg, #e84393, #fd79a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Delivering to</span>
          <span className="text-[11px] text-clay-text font-extrabold truncate block leading-tight">
            {shortAddr}
          </span>
        </div>
        {estimate?.isServiceable && (
          <div className="flex items-center gap-1 ml-auto mr-1 shrink-0 px-2.5 py-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(0,206,130,0.12), rgba(0,184,148,0.12))' }}>
            <Truck size={11} className="text-emerald-500" />
            <span className="text-[10px] font-extrabold whitespace-nowrap" style={{ background: 'linear-gradient(90deg, #00b894, #00cec9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {formatDate(estimate.deliveryDateMin)} – {formatDate(estimate.deliveryDateMax)}
            </span>
          </div>
        )}
        {estimate && !estimate.isServiceable && (
          <span className="text-[10px] font-extrabold ml-auto mr-1 shrink-0" style={{ background: 'linear-gradient(90deg, #ff6b6b, #ee5a24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Not serviceable
          </span>
        )}
      </div>
      <ChevronDown size={12} className="text-clay-text-muted/60 flex-shrink-0" />
    </Link>
  )
}
