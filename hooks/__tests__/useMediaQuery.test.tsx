/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";

function Probe({ query }: { query: string }) {
  const matches = useMediaQuery(query);
  return <div data-testid="matches">{String(matches)}</div>;
}

describe("useMediaQuery", () => {
  it("falls back to false when matchMedia is unavailable", () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: undefined,
    });

    try {
      render(<Probe query="(min-width: 768px)" />);
      expect(screen.getByTestId("matches")).toHaveTextContent("false");
    } finally {
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });
});
