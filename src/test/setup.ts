import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// Mock window.matchMedia for any component that uses it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock ResizeObserver (used by recharts and other libs)
class ResizeObserverMock {
  observe = () => {}
  unobserve = () => {}
  disconnect = () => {}
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
