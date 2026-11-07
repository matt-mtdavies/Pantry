import { useEffect, useState } from 'react'

// Hand-picked Unsplash photos for the demo recipes (chosen by an admin at
// /api/admin/demo-photos). Loaded once per page view from a public, edge-cached
// endpoint; until an admin picks any, the bundled CC0 photos are used.
// Kept apart from lib/demo so signed-in pages don't bundle the demo content.

export interface DemoPhotoCredit {
  url: string
  alt: string | null
  photographer: string
  photographer_url: string
  photo_url: string
}

export type DemoPhotoPicks = Record<string, DemoPhotoCredit>

let resolved: DemoPhotoPicks | null = null
let pending: Promise<DemoPhotoPicks> | null = null

/** Never rejects; gives up after `timeoutMs` and falls back to the bundled photos. */
export function loadDemoPhotos(timeoutMs = 2500): Promise<DemoPhotoPicks> {
  if (resolved) return Promise.resolve(resolved)
  if (!pending) {
    const fetched = fetch('/api/demo/photos', { signal: AbortSignal.timeout(timeoutMs) })
      .then(r => (r.ok ? r.json() : {}) as Promise<DemoPhotoPicks>)
      .catch(() => ({} as DemoPhotoPicks))
    pending = fetched.then(p => { resolved = p; return p })
  }
  return pending
}

/** Synchronous read for code that runs after loadDemoPhotos() has settled. */
export function getResolvedDemoPhotos(): DemoPhotoPicks {
  return resolved ?? {}
}

/** `ready` flips once the picks are known (or the request gave up). */
export function useDemoPhotos(enabled = true): { ready: boolean; picks: DemoPhotoPicks } {
  const [picks, setPicks] = useState<DemoPhotoPicks | null>(resolved)
  useEffect(() => {
    if (picks || !enabled) return
    let live = true
    loadDemoPhotos().then(p => { if (live) setPicks(p) })
    return () => { live = false }
  }, [picks, enabled])
  if (!enabled) return { ready: true, picks: {} }
  return { ready: picks !== null, picks: picks ?? {} }
}
