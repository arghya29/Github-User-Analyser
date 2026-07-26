import { useState, useEffect } from "react";

type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

function getBreakpoint(width: number): Breakpoint {
  const entries = Object.entries(BREAKPOINTS) as [Breakpoint, number][];
  let result: Breakpoint = "xs";
  for (const [bp, minWidth] of entries) {
    if (width >= minWidth) result = bp;
  }
  return result;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql =
      typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
    setMatches(mql?.matches ?? false);

    if (!mql || typeof mql.addEventListener !== "function") return;

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// 🛠️ FIX 1: Upgraded throttle to include a trailing-edge execution
function throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let last = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - last >= delay) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      last = now;
      fn(...args);
    } else if (!timeout) {
      timeout = setTimeout(
        () => {
          last = Date.now();
          timeout = null;
          fn(...args);
        },
        delay - (now - last),
      );
    }
  }) as unknown as T;
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("xs");

  // 🛠️ FIX 2: Removed unused rafId reference

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = throttle(
      () => setBp(getBreakpoint(window.innerWidth)),
      100,
    );
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      // 🛠️ FIX 2: Removed unused cancelAnimationFrame logic
    };
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
