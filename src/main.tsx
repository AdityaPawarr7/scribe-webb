import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'
import './styles.css'

console.log('[Scribe] main.tsx booting')

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<pre style="padding:24px;color:#f87171">No #root element</pre>'
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  console.log('[Scribe] React mounted')
}
