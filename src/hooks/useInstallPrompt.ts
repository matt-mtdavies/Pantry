import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false
  // iPadOS 13+ reports as MacIntel with touch points
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function useInstallPrompt() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [canPrompt, setCanPrompt] = useState(false)

  const isIos = detectIos()
  const isInstalled =
    typeof window !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setCanPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async (): Promise<boolean> => {
    if (!promptRef.current) return false
    await promptRef.current.prompt()
    const { outcome } = await promptRef.current.userChoice
    if (outcome === 'accepted') {
      promptRef.current = null
      setCanPrompt(false)
    }
    return outcome === 'accepted'
  }

  return { canPrompt, isIos, isInstalled, install }
}
