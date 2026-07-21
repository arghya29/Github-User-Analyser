/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ScrollToTop from '@/components/ScrollToTop'

describe('ScrollToTop', () => {
  it('does not throw when window.scrollTo is unavailable', () => {
    const originalScrollY = window.scrollY
    const originalScrollTo = window.scrollTo

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 400,
    })
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: undefined,
    })

    try {
      render(<ScrollToTop />)
      expect(
        screen.getByRole('button', { name: /scroll to top/i })
      ).toBeInTheDocument()
      expect(() =>
        fireEvent.click(screen.getByRole('button', { name: /scroll to top/i }))
      ).not.toThrow()
    } finally {
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        value: originalScrollY,
      })
      Object.defineProperty(window, 'scrollTo', {
        configurable: true,
        value: originalScrollTo,
      })
    }
  })
})
