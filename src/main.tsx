import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

type DiagWindow = { __diag?: (m: string) => void; __pantryStep?: string }

function step(s: string) {
  (window as unknown as DiagWindow).__pantryStep = s
}

if ('serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister())
    }).catch(() => {})
  } catch {
    // SW API partially available — ignore
  }
}

step('sw-done')

const rootEl = document.getElementById('root')
if (!rootEl) {
  step('no-root')
  document.body.innerHTML = '<div style="padding:2rem;font-family:system-ui">Root element missing — please reload.</div>'
} else {
  step('root-found')
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
    step('render-called')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    step('render-threw')
    ;(window as unknown as DiagWindow).__diag?.('createRoot error: ' + msg)
  }
}
