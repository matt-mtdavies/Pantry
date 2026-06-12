/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

interface WakeLockSentinel extends EventTarget {
  released: boolean
  type: 'screen'
  release(): Promise<void>
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>
}

interface Navigator {
  wakeLock: WakeLock
}
