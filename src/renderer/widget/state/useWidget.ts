import { createContext, useContext, type Dispatch } from 'react'
import type { WidgetAction, WidgetState } from './widgetReducer'

export interface WidgetContextValue {
  state: WidgetState
  dispatch: Dispatch<WidgetAction>
}

export const WidgetContext = createContext<WidgetContextValue | undefined>(undefined)

export function useWidget(): WidgetContextValue {
  const value = useContext(WidgetContext)
  if (!value) throw new Error('useWidget must be used inside WidgetProvider')
  return value
}
