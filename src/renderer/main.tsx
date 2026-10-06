import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SettingsWindow } from './SettingsWindow'
import { OverlayProvider } from './state/OverlayContext'
import './styles/globals.css'

const isSettingsWindow = new URLSearchParams(window.location.search).get('window') === 'settings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayProvider>
      {isSettingsWindow ? <SettingsWindow /> : <App />}
    </OverlayProvider>
  </StrictMode>
)
