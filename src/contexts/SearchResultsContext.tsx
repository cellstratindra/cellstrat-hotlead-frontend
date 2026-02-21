import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ScoreWeights } from '../api/client'
import type { HotLead } from '../types/leads'
import type { SearchChips, SearchFilters } from '../components/SearchBarWithChips'

const STORAGE_KEY = 'hotlead_search'

export interface LastSearch {
  leads: HotLead[]
  searchChips: SearchChips
  filters: SearchFilters
  scoreWeights: ScoreWeights
}

export interface SearchHistoryEntry {
  id: string
  chips: SearchChips
  filters: SearchFilters
  resultCount: number
  timestamp: number
}

const MAX_HISTORY = 15
const MAX_LEADS_STORED = 500

interface SearchResultsState {
  lastSearch: LastSearch | null
  searchHistory: SearchHistoryEntry[]
}

interface SearchResultsContextValue extends SearchResultsState {
  setLastSearch: (value: LastSearch | null) => void
  /** Add a completed search to lastSearch and prepend to history. */
  saveSearch: (search: LastSearch) => void
  /** Remove one entry from history by id. */
  removeHistoryEntry: (id: string) => void
  clearHistory: () => void
}

const SearchResultsContext = createContext<SearchResultsContextValue | null>(null)

function loadPersisted(): { lastSearch: LastSearch | null; searchHistory: SearchHistoryEntry[] } {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return { lastSearch: null, searchHistory: [] }
    const data = JSON.parse(raw) as {
      lastSearch?: LastSearch | null
      searchHistory?: SearchHistoryEntry[]
    }
    const lastSearch =
      data.lastSearch && Array.isArray(data.lastSearch.leads)
        ? {
            ...data.lastSearch,
            leads: (data.lastSearch.leads as HotLead[]).slice(0, MAX_LEADS_STORED),
          }
        : null
    const searchHistory = Array.isArray(data.searchHistory) ? data.searchHistory.slice(0, MAX_HISTORY) : []
    return { lastSearch, searchHistory }
  } catch {
    return { lastSearch: null, searchHistory: [] }
  }
}

function getInitialState() {
  const { lastSearch, searchHistory } = loadPersisted()
  return { lastSearch, searchHistory }
}

export function SearchResultsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(getInitialState)
  const lastSearch = state.lastSearch
  const searchHistory = state.searchHistory
  const setLastSearch = useCallback((value: LastSearch | null) => {
    setState((s) => ({ ...s, lastSearch: value }))
  }, [])
  const setSearchHistory = useCallback((updater: SearchHistoryEntry[] | ((prev: SearchHistoryEntry[]) => SearchHistoryEntry[])) => {
    setState((s) => ({
      ...s,
      searchHistory: typeof updater === 'function' ? updater(s.searchHistory) : updater,
    }))
  }, [])

  const saveSearch = useCallback((search: LastSearch) => {
    setLastSearch(search)
    setSearchHistory((prev) => {
      const entry: SearchHistoryEntry = {
        id: crypto.randomUUID(),
        chips: search.searchChips,
        filters: search.filters,
        resultCount: search.leads.length,
        timestamp: Date.now(),
      }
      return [entry, ...prev.filter((e) => !sameChips(e.chips, entry.chips))].slice(0, MAX_HISTORY)
    })
  }, [setLastSearch, setSearchHistory])

  const removeHistoryEntry = useCallback((id: string) => {
    setSearchHistory((prev) => prev.filter((e) => e.id !== id))
  }, [setSearchHistory])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
  }, [setSearchHistory])

  useEffect(() => {
    try {
      const toStore = {
        lastSearch: lastSearch
          ? {
              ...lastSearch,
              leads: lastSearch.leads.slice(0, MAX_LEADS_STORED),
            }
          : null,
        searchHistory: searchHistory.slice(0, MAX_HISTORY),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // quota or disabled localStorage
    }
  }, [lastSearch, searchHistory])

  const value = useMemo<SearchResultsContextValue>(
    () => ({
      lastSearch,
      searchHistory,
      setLastSearch,
      saveSearch,
      removeHistoryEntry,
      clearHistory,
    }),
    [lastSearch, searchHistory, setLastSearch, saveSearch, removeHistoryEntry, clearHistory]
  )

  return (
    <SearchResultsContext.Provider value={value}>
      {children}
    </SearchResultsContext.Provider>
  )
}

function sameChips(a: SearchChips, b: SearchChips): boolean {
  return a.city === b.city && a.specialty === b.specialty && a.region === b.region
}

export function useSearchResults(): SearchResultsContextValue {
  const ctx = useContext(SearchResultsContext)
  if (!ctx) throw new Error('useSearchResults must be used within SearchResultsProvider')
  return ctx
}

/** Optional hook that returns null if outside provider (e.g. for components that can render in or out of dashboard). */
export function useSearchResultsOptional(): SearchResultsContextValue | null {
  return useContext(SearchResultsContext)
}
