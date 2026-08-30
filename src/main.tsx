import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// No StrictMode (per react-dev.md): avoids double-mount effects.
// HashRouter lives here; App.tsx owns the route table.
// HashRouter (not BrowserRouter): the Launchpad static host has no SPA
// fallback, so history-based deep links 404 on hard loads.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <HashRouter>
      <App />
    </HashRouter>
  </ErrorBoundary>,
)
