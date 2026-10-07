import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardApp } from './DashboardApp'
import { DashboardProvider } from './state/DashboardContext'
import '../styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DashboardProvider>
      <DashboardApp />
    </DashboardProvider>
  </StrictMode>
)
