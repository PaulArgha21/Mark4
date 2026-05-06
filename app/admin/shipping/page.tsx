'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { toast } from 'sonner'
import {
  MapPin, Truck, Package, Search, Plus, RefreshCw, ChevronDown,
  Globe, Zap, Clock, IndianRupee, Filter, Loader2, CheckCircle2,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json()).then(r => r.data)

interface Zone {
  id: string; name: string; type: string; description?: string; isActive: boolean
  _count?: { pincodes: number }
}

interface PincodeEntry {
  id: string; pincode: string; city: string; district?: string; state: string
  stateCode?: string; isServiceable: boolean; isCODAvailable: boolean; deliveryNote?: string
  zone: { id: string; name: string; type: string }
}

interface Policy {
  id: string; minDays: number; maxDays: number; baseCost: number; perKgCost: number
  freeShippingAbove: number | null; isExpressAvailable: boolean
  expressMinDays?: number; expressMaxDays?: number; expressCost?: number
  originZone: { id: string; name: string; type: string }
  destinationZone: { id: string; name: string; type: string }
}

type Tab = 'zones' | 'pincodes' | 'policies' | 'warehouses'

const ZONE_COLORS: Record<string, string> = {
  METRO: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  TIER1: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  TIER2: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  TIER3: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  RURAL: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  REMOTE: 'bg-red-500/20 text-red-300 border-red-500/30',
  NON_SERVICEABLE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export default function ShippingPage() {
  const [tab, setTab] = useState<Tab>('zones')
  const [search, setSearch] = useState('')
  const [seeding, setSeeding] = useState(false)

  const { data: zones, isLoading: zonesLoading } = useSWR<Zone[]>('/api/portal/shipping/zones', fetcher)
  const { data: pincodeData } = useSWR<{ pincodes: PincodeEntry[]; total: number; states: string[] }>(
    tab === 'pincodes' ? `/api/portal/shipping/pincodes?q=${search}&limit=50` : null, fetcher
  )
  const { data: policies } = useSWR<Policy[]>(
    tab === 'policies' ? '/api/portal/shipping/policies' : null, fetcher
  )

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/portal/shipping/seed', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Seeded ${data.data.zones} zones, ${data.data.policies} policies, ${data.data.pincodes} pincodes`)
        mutate('/api/portal/shipping/zones')
        mutate((key: string) => typeof key === 'string' && key.startsWith('/api/portal/shipping/'), undefined, { revalidate: true })
      } else {
        toast.error(data.error || 'Seed failed')
      }
    } catch {
      toast.error('Network error')
    }
    setSeeding(false)
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'zones', label: 'Zones', icon: Globe },
    { key: 'pincodes', label: 'Pincodes', icon: MapPin },
    { key: 'policies', label: 'Policies', icon: Truck },
    { key: 'warehouses', label: 'Warehouses', icon: Package },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-portal-text flex items-center gap-2">
            <Truck size={24} className="text-portal-accent" />
            Shipping & Delivery
          </h1>
          <p className="text-sm text-portal-muted mt-1">
            Manage Indian pincode directory, shipping zones, delivery policies & warehouse locations
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 bg-portal-accent text-white rounded-lg hover:bg-portal-accent/90 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {seeding ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {seeding ? 'Seeding...' : 'Seed Default Data'}
        </button>
      </div>

      {/* Stats Row */}
      {zones && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Globe} label="Shipping Zones" value={zones.length} />
          <StatCard icon={MapPin} label="Pincodes" value={zones.reduce((s, z) => s + (z._count?.pincodes || 0), 0)} />
          <StatCard icon={Truck} label="Policies" value={policies?.length ?? '—'} />
          <StatCard icon={Package} label="Active Zones" value={zones.filter(z => z.isActive).length} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-portal-surface rounded-xl p-1 border border-portal-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              tab === t.key
                ? 'bg-portal-accent text-white shadow-md'
                : 'text-portal-muted hover:text-portal-text hover:bg-portal-elevated'
            }`}
          >
            <t.icon size={16} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'zones' && <ZonesTab zones={zones} loading={zonesLoading} />}
      {tab === 'pincodes' && (
        <PincodesTab
          pincodes={pincodeData?.pincodes ?? []}
          total={pincodeData?.total ?? 0}
          states={pincodeData?.states ?? []}
          search={search}
          onSearchChange={setSearch}
        />
      )}
      {tab === 'policies' && <PoliciesTab policies={policies ?? []} />}
      {tab === 'warehouses' && <WarehousesTab />}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-portal-surface border border-portal-border rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-portal-accent/10 flex items-center justify-center">
        <Icon size={18} className="text-portal-accent" />
      </div>
      <div>
        <p className="text-xl font-bold text-portal-text">{value}</p>
        <p className="text-xs text-portal-muted">{label}</p>
      </div>
    </div>
  )
}

function ZonesTab({ zones, loading }: { zones?: Zone[]; loading: boolean }) {
  if (loading) return <div className="text-center py-12 text-portal-muted"><Loader2 className="animate-spin mx-auto" /></div>
  if (!zones?.length) return <EmptyState message="No zones configured. Click 'Seed Default Data' to add Indian shipping zones." />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {zones.map(zone => (
        <div key={zone.id} className="bg-portal-surface border border-portal-border rounded-xl p-5 hover:border-portal-accent/30 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${ZONE_COLORS[zone.type] ?? ZONE_COLORS.TIER2}`}>
              {zone.type.replace('_', ' ')}
            </span>
            <span className={`w-2 h-2 rounded-full ${zone.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
          </div>
          <h3 className="font-semibold text-portal-text text-lg">{zone.name}</h3>
          {zone.description && <p className="text-xs text-portal-muted mt-1 line-clamp-2">{zone.description}</p>}
          <div className="mt-3 flex items-center gap-2 text-xs text-portal-muted">
            <MapPin size={12} />
            <span>{zone._count?.pincodes || 0} pincodes</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function PincodesTab({ pincodes, total, states, search, onSearchChange }: {
  pincodes: PincodeEntry[]; total: number; states: string[]
  search: string; onSearchChange: (s: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-portal-muted" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by pincode, city, or district..."
            className="w-full pl-10 pr-4 py-2.5 bg-portal-surface border border-portal-border rounded-xl text-sm text-portal-text placeholder:text-portal-muted focus:border-portal-accent focus:outline-none"
          />
        </div>
        <span className="flex items-center gap-1 px-3 py-2 bg-portal-surface border border-portal-border rounded-xl text-xs text-portal-muted">
          <Filter size={14} /> {total} results
        </span>
      </div>

      {/* Table */}
      {pincodes.length === 0 ? (
        <EmptyState message="No pincodes found. Seed default data or add pincodes manually." />
      ) : (
        <div className="bg-portal-surface border border-portal-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-portal-border text-portal-muted text-xs uppercase">
                  <th className="text-left px-4 py-3 font-semibold">Pincode</th>
                  <th className="text-left px-4 py-3 font-semibold">City</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">District</th>
                  <th className="text-left px-4 py-3 font-semibold">State</th>
                  <th className="text-left px-4 py-3 font-semibold">Zone</th>
                  <th className="text-center px-4 py-3 font-semibold">COD</th>
                  <th className="text-center px-4 py-3 font-semibold">Active</th>
                </tr>
              </thead>
              <tbody>
                {pincodes.map(p => (
                  <tr key={p.id} className="border-b border-portal-border/50 hover:bg-portal-elevated/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-portal-text">{p.pincode}</td>
                    <td className="px-4 py-3 text-portal-text">{p.city}</td>
                    <td className="px-4 py-3 text-portal-muted hidden md:table-cell">{p.district || '—'}</td>
                    <td className="px-4 py-3 text-portal-text">{p.state}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ZONE_COLORS[p.zone.type] ?? ''}`}>
                        {p.zone.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.isCODAvailable ? <CheckCircle2 size={16} className="text-emerald-400 mx-auto" /> : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`w-2 h-2 rounded-full inline-block ${p.isServiceable ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function PoliciesTab({ policies }: { policies: Policy[] }) {
  if (!policies.length) return <EmptyState message="No delivery policies configured. Seed default data to create the zone-to-zone transit matrix." />

  return (
    <div className="bg-portal-surface border border-portal-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-portal-border text-portal-muted text-xs uppercase">
              <th className="text-left px-4 py-3 font-semibold">Origin</th>
              <th className="text-left px-4 py-3 font-semibold">Destination</th>
              <th className="text-center px-4 py-3 font-semibold">Standard</th>
              <th className="text-center px-4 py-3 font-semibold">Express</th>
              <th className="text-right px-4 py-3 font-semibold">Cost</th>
              <th className="text-right px-4 py-3 font-semibold">Free Above</th>
            </tr>
          </thead>
          <tbody>
            {policies.map(p => (
              <tr key={p.id} className="border-b border-portal-border/50 hover:bg-portal-elevated/50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ZONE_COLORS[p.originZone.type] ?? ''}`}>
                    {p.originZone.name}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${ZONE_COLORS[p.destinationZone.type] ?? ''}`}>
                    {p.destinationZone.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-portal-text">
                    <Clock size={13} className="text-portal-muted" />
                    <span className="font-medium">{p.minDays}–{p.maxDays} days</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {p.isExpressAvailable ? (
                    <div className="flex items-center justify-center gap-1 text-amber-400">
                      <Zap size={13} />
                      <span className="font-medium">{p.expressMinDays}–{p.expressMaxDays}d</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="flex items-center justify-end gap-0.5 text-portal-text font-medium">
                    <IndianRupee size={12} />{p.baseCost}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-portal-muted">
                  {p.freeShippingAbove ? (
                    <span className="flex items-center justify-end gap-0.5">
                      <IndianRupee size={11} />{p.freeShippingAbove}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WarehousesTab() {
  const { data: warehouses, isLoading } = useSWR('/api/portal/shipping/warehouses', fetcher)

  if (isLoading) return <div className="text-center py-12 text-portal-muted"><Loader2 className="animate-spin mx-auto" /></div>
  if (!warehouses?.length) return <EmptyState message="No warehouses with pincode configured. Update warehouse locations in Inventory to enable delivery estimation." />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {warehouses.map((w: { id: string; name: string; code: string; pincode?: string; city?: string; state?: string; isActive: boolean }) => (
        <div key={w.id} className="bg-portal-surface border border-portal-border rounded-xl p-5 hover:border-portal-accent/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-portal-text">{w.name}</h3>
            <span className={`w-2 h-2 rounded-full ${w.isActive ? 'bg-emerald-400' : 'bg-gray-500'}`} />
          </div>
          <p className="text-xs text-portal-muted font-mono">{w.code}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-portal-muted">
            {w.pincode && <span className="flex items-center gap-1"><MapPin size={12} /> {w.pincode}</span>}
            {w.city && <span>{w.city}, {w.state}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 bg-portal-surface border border-portal-border rounded-xl">
      <Package size={40} className="mx-auto text-portal-muted/40 mb-3" />
      <p className="text-sm text-portal-muted max-w-md mx-auto">{message}</p>
    </div>
  )
}
