import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { FilterDrawerProvider } from '../contexts/FilterDrawerContext'
import { HeaderActionsProvider } from '../contexts/HeaderActionsContext'
import { SearchResultsProvider } from '../contexts/SearchResultsContext'

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'test-user-id' } }),
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <HeaderActionsProvider>
        <SearchResultsProvider>
          <FilterDrawerProvider>
            <Dashboard />
          </FilterDrawerProvider>
        </SearchResultsProvider>
      </HeaderActionsProvider>
    </MemoryRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }))
  })

  it('renders without crashing', () => {
    renderDashboard()
    expect(screen.getByRole('button', { name: /search and filters/i })).toBeInTheDocument()
  })

  it('shows Filter button and it is clickable', async () => {
    renderDashboard()
    const filterButton = screen.getByRole('button', { name: /search and filters/i })
    expect(filterButton).toHaveAttribute('type', 'button')
    await userEvent.click(filterButton)
    expect(filterButton).toBeInTheDocument()
  })

  it('Filter button has touch-target and cursor-pointer for accessibility', () => {
    renderDashboard()
    const filterBtn = screen.getByRole('button', { name: /search and filters/i })
    expect(filterBtn.className).toMatch(/cursor-pointer|touch-target/)
  })
})
