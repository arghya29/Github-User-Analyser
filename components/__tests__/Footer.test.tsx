/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Footer from '@/components/Footer'

jest.mock('@/lib/pwa', () => ({
  triggerInstall: jest.fn().mockResolvedValue(false),
}))

describe('Footer', () => {
  it('does not throw when the install prompt dispatch is unavailable', async () => {
    render(<Footer />)
    const originalDispatchEvent = window.dispatchEvent
    Object.defineProperty(window, 'dispatchEvent', {
      configurable: true,
      value: undefined,
    })

    try {
      expect(() => fireEvent.click(screen.getByRole('button', { name: /install app/i }))).not.toThrow()
    } finally {
      Object.defineProperty(window, 'dispatchEvent', {
        configurable: true,
        value: originalDispatchEvent,
      })
    }
  })
})
