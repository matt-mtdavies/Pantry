import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

// Unregister any stale service workers. Wrapped in try/catch because some
// iOS in-app browser contexts expose navigator.serviceWorker but throw
// synchronously when getRegistrations() is called, which would crash the
// entire module and prevent React from mounting.
if ('serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister())
    }).catch(() => {})
  } catch {
    // SW API partially available — ignore
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;font-family:system-ui">Root element missing — please reload.</div>'
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
