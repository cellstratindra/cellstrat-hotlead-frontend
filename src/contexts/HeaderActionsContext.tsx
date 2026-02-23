import { createContext, useContext, useState } from 'react'

export interface HeaderExportAction {
  label: string
  onClick: () => void
}

interface HeaderActionsContextValue {
  exportAction: HeaderExportAction | null
  setExportAction: (action: HeaderExportAction | null) => void
}

const HeaderActionsContext = createContext<HeaderActionsContextValue | null>(null)

export function HeaderActionsProvider({ children }: { children: React.ReactNode }) {
  const [exportAction, setExportAction] = useState<HeaderExportAction | null>(null)
  const value: HeaderActionsContextValue = { exportAction, setExportAction }
  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  )
}

export function useHeaderActions() {
  return useContext(HeaderActionsContext)
}
