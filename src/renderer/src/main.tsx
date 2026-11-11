import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ImageViewerWindow } from './windows/ImageViewerWindow'
import { SettingsWindow } from './windows/SettingsWindow'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './assets/main.css'

function RootRouter(): React.ReactElement {
  const [route, setRoute] = useState(() => window.location.hash)

  useEffect(() => {
    const handleHashChange = (): void => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (route.startsWith('#/image-viewer') || route.startsWith('#image-viewer')) {
    return <ImageViewerWindow />
  }

  if (route.startsWith('#/settings') || route.startsWith('#settings')) {
    return <SettingsWindow />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RootRouter />
    </ErrorBoundary>
  </React.StrictMode>
)
