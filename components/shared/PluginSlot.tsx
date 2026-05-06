'use client'
import { Suspense, useEffect, useState, lazy, type ComponentType } from 'react'
import type { PluginManifest } from '@/lib/plugins'

interface PluginSlotProps {
  name: string
  context?: Record<string, unknown>
}

interface PluginComponentProps {
  context?: Record<string, unknown>
  config?: Record<string, unknown>
}

const componentCache = new Map<string, ComponentType<PluginComponentProps>>()

function getPluginComponent(pluginName: string): ComponentType<PluginComponentProps> {
  if (!componentCache.has(pluginName)) {
    const LazyComponent = lazy(() =>
      import(`@/plugins/${pluginName}`).catch(() => ({
        default: () => null as React.ReactElement | null,
      }))
    )
    componentCache.set(pluginName, LazyComponent)
  }
  return componentCache.get(pluginName)!
}

export function PluginSlot({ name, context }: PluginSlotProps) {
  const [plugins, setPlugins] = useState<PluginManifest[]>([])

  useEffect(() => {
    fetch(`/api/plugins/hooks?hookName=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(r => setPlugins(r.data ?? []))
      .catch(() => {})
  }, [name])

  if (plugins.length === 0) return null

  return (
    <>
      {plugins.map(plugin => {
        const Component = getPluginComponent(plugin.name)
        return (
          <Suspense key={plugin.name} fallback={null}>
            <Component context={context} config={plugin.config} />
          </Suspense>
        )
      })}
    </>
  )
}
