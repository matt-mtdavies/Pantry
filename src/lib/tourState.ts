// Where the visitor got to in the demo tour, so the entry pill can offer
// "Resume" after a mid-tour exit. Per tab (sessionStorage); failures are fine.

const KEY = 'pantry-tour'
export const TOUR_SCENE_COUNT = 7

export interface TourProgress { scene: number; finished: boolean }

export function readTourProgress(): TourProgress | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    return v && typeof v.scene === 'number' ? { scene: v.scene, finished: !!v.finished } : null
  } catch { return null }
}

export function saveTourProgress(p: TourProgress) {
  try { sessionStorage.setItem(KEY, JSON.stringify(p)) } catch { /* storage unavailable */ }
}
