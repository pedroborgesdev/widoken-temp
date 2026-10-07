import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WidgetApp } from './WidgetApp'
import { WidgetProvider } from './state/WidgetContext'
import '../styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WidgetProvider>
      <WidgetApp />
    </WidgetProvider>
  </StrictMode>
)
