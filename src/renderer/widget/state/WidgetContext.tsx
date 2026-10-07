import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { ProviderView } from '@shared/provider'
import { useProviders } from '../../hooks/useProviders'
import { widgetDesktop } from '../../services/desktop'
import { initialWidgetState, widgetReducer, type WidgetAction, type WidgetState } from './widgetReducer'

interface WidgetContextValue {
  state: WidgetState
  dispatch: Dispatch<WidgetAction>
}

const WidgetContext = createContext<WidgetContextValue | undefined>(undefined)

export function WidgetProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(widgetReducer, initialWidgetState)
  const updateProviders = useCallback((providers: ProviderView[]) => {
    dispatch({ type: 'providers-updated', providers })
  }, [])

  useProviders(updateProviders)

  useEffect(() => {
    let active = true
    void widgetDesktop.settings.get().then((settings) => {
      if (active) dispatch({ type: 'settings-loaded', settings })
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => widgetDesktop.settings.onUpdated((settings) => {
    dispatch({ type: 'settings-updated', settings })
  }), [])

  useEffect(() => widgetDesktop.dashboard.onWindowState((open) => {
    dispatch({ type: 'dashboard-window-changed', open })
  }), [])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
}

export function useWidget(): WidgetContextValue {
  const value = useContext(WidgetContext)
  if (!value) throw new Error('useWidget must be used inside WidgetProvider')
  return value
}
