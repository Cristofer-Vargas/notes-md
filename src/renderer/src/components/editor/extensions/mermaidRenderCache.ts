const MAX_ENTRIES = 100
const cache = new Map<string, { svg: string; id: string }>()

export function getCachedMermaid(key: string, instanceId: string): string | null {
  const entry = cache.get(key)
  if (!entry) return null
  cache.delete(key)
  cache.set(key, entry)
  return entry.svg.replaceAll(entry.id, instanceId)
}

export function cacheMermaid(key: string, svg: string, id: string): void {
  cache.delete(key)
  cache.set(key, { svg, id })
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
}
