import { createContext, useContext, useState, useCallback } from 'react'

interface FilterDrawerContextValue {
  open: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const FilterDrawerContext = createContext<FilterDrawerContextValue | null>(null)

export function FilterDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openDrawer = useCallback(() => setOpen(true), [])
  const closeDrawer = useCallback(() => setOpen(false), [])
  const value: FilterDrawerContextValue = { open, openDrawer, closeDrawer }
  return (
    <FilterDrawerContext.Provider value={value}>
      {children}
    </FilterDrawerContext.Provider>
  )
}

export function useFilterDrawer() {
  const ctx = useContext(FilterDrawerContext)
  return ctx
}
