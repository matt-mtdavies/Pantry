import { useCallback, useEffect, useRef, useState } from 'react'

export function useWakeLock() {
  const [isActive, setIsActive] = useState(false)
  const lockRef = useRef<WakeLockSentinel | null>(null)
  const wantedRef = useRef(false)

  const acquire = useCallback(async () => {
    if (!('wakeLock' in navigator)) return
    wantedRef.current = true
    try {
      const lock = await navigator.wakeLock.request('screen')
      lockRef.current = lock
      setIsActive(true)
      lock.addEventListener('release', () => {
        setIsActive(false)
        lockRef.current = null
      })
    } catch {
      // User denied or not supported — silent fail
    }
  }, [])

  const release = useCallback(() => {
    wantedRef.current = false
    lockRef.current?.release()
    lockRef.current = null
    setIsActive(false)
  }, [])

  // Re-acquire after tab becomes visible again (iOS releases lock on tab switch)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && wantedRef.current && !lockRef.current) {
        acquire()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [acquire])

  return { isActive, acquire, release, supported: 'wakeLock' in navigator }
}
