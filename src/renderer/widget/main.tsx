import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GuidesApp } from './GuidesApp'
import { WidgetApp } from './WidgetApp'
import { WidgetProvider } from './state/WidgetContext'
import '../styles/globals.css'

const guides = new URLSearchParams(window.location.search).get('role') === 'guides'
const root = createRoot(document.getElementById('root')!)

if (guides) {
  root.render(
    <StrictMode>
      <GuidesApp />
    </StrictMode>
  )
} else {
  root.render(
    <StrictMode>
      <WidgetProvider>
        <WidgetApp />
      </WidgetProvider>
    </StrictMode>
  )
}
