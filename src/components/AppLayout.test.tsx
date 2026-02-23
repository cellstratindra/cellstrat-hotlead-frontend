import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { HeaderActionsProvider } from '../contexts/HeaderActionsContext'

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: { id: 'layout-user' } }),
  UserButton: () => <div data-testid="user-button">User</div>,
}))

vi.mock('../api/client', () => ({
  getGmailStatus: () => Promise.resolve({ connected: false }),
}))

describe('AppLayout', () => {
  it('renders nav links with proper spacing container', () => {
    render(
      <MemoryRouter>
        <HeaderActionsProvider>
          <AppLayout />
        </HeaderActionsProvider>
      </MemoryRouter>
    )
    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard|hot leads home/i })
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1)
    const myLeadsLinks = screen.getAllByRole('link', { name: /my leads/i })
    expect(myLeadsLinks.length).toBeGreaterThanOrEqual(1)
    const settingsLinks = screen.getAllByRole('link', { name: /settings|data settings/i })
    expect(settingsLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('uses canvas background for main wrapper', () => {
    const { container } = render(
      <MemoryRouter>
        <HeaderActionsProvider>
          <AppLayout />
        </HeaderActionsProvider>
      </MemoryRouter>
    )
    const mainWrapper = container.firstChild as HTMLElement
    expect(mainWrapper).toHaveClass('bg-[var(--color-canvas)]')
  })
})
