import { Component, ReactNode } from 'react'
import { DishIcon } from './icons'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#FAF7F2', padding: '2rem', textAlign: 'center',
          fontFamily: 'Georgia, serif',
        }}>
          <div style={{ marginBottom: '1.5rem', opacity: 0.5, color: '#9C9189' }}><DishIcon size={56} /></div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.75rem', color: '#1F1B16', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6B6459', marginBottom: '2rem', maxWidth: '380px', lineHeight: 1.6 }}>
            The app hit an unexpected error. Tap below to reload.
          </p>
          <p style={{ fontSize: '0.75rem', color: '#9C9189', marginBottom: '2rem', maxWidth: '480px', wordBreak: 'break-all' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '1rem 2rem', background: '#C4633E', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '1rem',
              fontFamily: 'system-ui, sans-serif', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reload Pantry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
