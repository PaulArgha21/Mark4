'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plug, ToggleLeft, ToggleRight, Shield, RefreshCw } from 'lucide-react'
import { PortalShell } from '@/components/portal/layout/PortalShell'
import { CredentialGate } from '@/components/portal/shared/CredentialGate'
import { staggerContainer, fadeUpVariants, springs } from '@/lib/animations'
import { toast } from 'sonner'

interface PluginItem {
  id: string; name: string; displayName: string; version: string
  description: string | null; isActive: boolean; config: unknown
  installedAt: string; hookCount: number; activeHookCount: number
  hooks: { id: string; hookName: string; isActive: boolean }[]
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [elevateFor, setElevateFor] = useState<string | null>(null)

  const fetchData = () => {
    setLoading(true)
    fetch('/api/portal/plugins').then(r => r.json())
      .then(d => { if (d.data) setPlugins(d.data.items ?? []) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const doToggle = async (pluginId: string) => {
    setToggling(pluginId)
    try {
      const res = await fetch(`/api/portal/plugins/${pluginId}/toggle`, { method: 'PUT' })
      if (res.ok) {
        const d = await res.json()
        toast.success(d.data?.message ?? 'Plugin updated')
        fetchData()
      } else if (res.status === 403) {
        setElevateFor(pluginId)
      } else {
        const d = await res.json()
        toast.error(d.error?.message ?? 'Failed')
      }
    } catch { toast.error('Network error') }
    finally { setToggling(null) }
  }

  return (
    <PortalShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUpVariants} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>Plugins</h1>
            <p className="text-sm" style={{ color: 'var(--portal-muted)' }}>Manage installed plugin extensions</p>
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl hover:bg-white/5 transition-colors" style={{ color: 'var(--portal-muted)' }}>
            <RefreshCw size={16} />
          </button>
        </motion.div>

        {/* Summary */}
        <motion.div variants={fadeUpVariants} className="grid grid-cols-3 gap-4">
          {[
            { label: 'Installed', value: plugins.length, color: '#339af0' },
            { label: 'Active', value: plugins.filter(p => p.isActive).length, color: '#2f9e44' },
            { label: 'Total Hooks', value: plugins.reduce((s, p) => s + p.hookCount, 0), color: '#7950f2' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <p className="font-display text-2xl font-bold" style={{ color: 'var(--portal-text)' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--portal-muted)' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Plugin list */}
        <motion.div variants={fadeUpVariants} className="space-y-3">
          {loading ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl animate-pulse" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
              <div className="h-4 w-40 rounded bg-white/10 mb-2" /><div className="h-3 w-60 rounded bg-white/10" />
            </div>
          )) : plugins.length === 0 ? (
            <div className="flex flex-col items-center py-16 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px dashed var(--portal-border)' }}>
              <Plug size={40} style={{ color: 'var(--portal-muted)' }} />
              <p className="mt-3 text-sm" style={{ color: 'var(--portal-muted)' }}>No plugins installed yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--portal-muted)' }}>Plugins extend storefront and portal with custom hooks</p>
            </div>
          ) : plugins.map(plugin => (
            <motion.div key={plugin.id} className="p-5 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
              whileHover={{ borderColor: plugin.isActive ? '#2f9e44' : 'var(--portal-border)' }} transition={springs.gentle}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: plugin.isActive ? '#2f9e4415' : '#86868615' }}>
                    <Plug size={18} style={{ color: plugin.isActive ? '#2f9e44' : '#868686' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--portal-text)' }}>{plugin.displayName}</h3>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--portal-bg)', color: 'var(--portal-muted)' }}>v{plugin.version}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${plugin.isActive ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {plugin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {plugin.description && <p className="text-xs mt-0.5" style={{ color: 'var(--portal-muted)' }}>{plugin.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>{plugin.hookCount} hooks ({plugin.activeHookCount} active)</span>
                      <span className="text-[10px]" style={{ color: 'var(--portal-muted)' }}>Installed {new Date(plugin.installedAt).toLocaleDateString()}</span>
                    </div>
                    {plugin.hooks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {plugin.hooks.map(h => (
                          <span key={h.id} className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
                            style={{ background: h.isActive ? '#7950f210' : 'var(--portal-bg)', color: h.isActive ? '#7950f2' : 'var(--portal-muted)' }}>
                            {h.hookName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => doToggle(plugin.id)} disabled={toggling === plugin.id}
                  className="shrink-0 p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  title={plugin.isActive ? 'Deactivate' : 'Activate'}>
                  {plugin.isActive
                    ? <ToggleRight size={28} style={{ color: '#2f9e44' }} />
                    : <ToggleLeft size={28} style={{ color: '#868686' }} />}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Security note */}
        <motion.div variants={fadeUpVariants} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#f08c0008', border: '1px solid #f08c0020' }}>
          <Shield size={14} style={{ color: '#f08c00' }} />
          <span className="text-xs" style={{ color: '#f08c00' }}>Plugin activation/deactivation requires credential elevation for security</span>
        </motion.div>
      </motion.div>

      {/* Credential Gate */}
      {elevateFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
            <CredentialGate action="toggle plugin" onSuccess={() => { const id = elevateFor; setElevateFor(null); doToggle(id) }} onCancel={() => setElevateFor(null)} />
          </div>
        </div>
      )}
    </PortalShell>
  )
}
