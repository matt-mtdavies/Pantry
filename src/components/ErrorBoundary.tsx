import { Component, ErrorInfo, ReactNode } from 'react'
import { DishIcon } from './icons'
import styles from './ErrorBoundary.module.css'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the details for debugging without showing raw errors to users.
    console.error('Pantry crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.wrap} role="alert">
          <DishIcon size={56} className={styles.icon} />
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.message}>
            Pantry hit an unexpected snag. Your recipes are safe — reloading usually sorts it out.
          </p>
          <button className={styles.reload} onClick={() => window.location.reload()}>
            Reload Pantry
          </button>
          <a href="/" className={styles.home}>Go to my recipes</a>
        </div>
      )
    }
    return this.props.children
  }
}
