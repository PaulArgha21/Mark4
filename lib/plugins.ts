import { redis } from './redis'
import { db } from './db'

export interface PluginManifest {
  name: string
  hookName: string
  componentPath: string
  config?: Record<string, unknown>
}

const CACHE_KEY = 'plugins:active:all'
const CACHE_TTL = 300 // 5 minutes

let pluginCache: Map<string, PluginManifest[]> | null = null

export async function getActivePluginsForHook(hookName: string): Promise<PluginManifest[]> {
  if (!pluginCache) {
    await loadPluginCache()
  }
  return pluginCache?.get(hookName) ?? []
}

async function loadPluginCache() {
  // Try Redis first
  try {
    const cached = await redis.get<string>(CACHE_KEY)
    if (cached) {
      const entries: [string, PluginManifest[]][] = typeof cached === 'string' ? JSON.parse(cached) : cached
      pluginCache = new Map(entries)
      return
    }
  } catch {
    // Redis unavailable — fall through to DB
  }

  // Load from DB
  const hooks = await db.pluginHook.findMany({
    where: { isActive: true, plugin: { isActive: true } },
    include: { plugin: true },
  })

  pluginCache = new Map()
  for (const hook of hooks) {
    const manifests = pluginCache.get(hook.hookName) ?? []
    manifests.push({
      name: hook.plugin.name,
      hookName: hook.hookName,
      componentPath: `@/plugins/${hook.plugin.name}`,
      config: (hook.config as Record<string, unknown>) ?? {},
    })
    pluginCache.set(hook.hookName, manifests)
  }

  // Cache in Redis
  try {
    await redis.set(CACHE_KEY, JSON.stringify(Array.from(pluginCache.entries())), { ex: CACHE_TTL })
  } catch {
    // Non-critical — cache miss next time
  }
}

export async function invalidatePluginCache() {
  pluginCache = null
  try {
    await redis.del(CACHE_KEY)
  } catch {
    // Non-critical
  }
}
