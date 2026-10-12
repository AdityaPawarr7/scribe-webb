import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { err: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null }
  static getDerivedStateFromError(err: Error) {
    return { err }
  }
  componentDidCatch(err: Error, info: unknown) {
    console.error('[Scribe] render crash:', err, info)
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: 'ui-sans-serif, system-ui', color: '#fff', background: '#0a0a0a', minHeight: '100vh' }}>
          <h1 style={{ color: '#f87171', fontSize: 18, marginBottom: 8 }}>Scribe crashed on render</h1>
          <p style={{ color: '#d4d4d4', marginBottom: 12 }}>Check the browser DevTools console for the full stack trace.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#171717', padding: 12, borderRadius: 8, fontSize: 12 }}>
            {this.state.err.message}
            {'\n\n'}
            {this.state.err.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
