import { useLayoutEffect, useState } from 'react';

/**
 * The observed content width of an element, or `null` until it can be measured.
 *
 * The board needs its own width rather than a media query, because whether all
 * columns fit depends on how many the backend configured -- a fact no CSS
 * breakpoint knows. `null` (rather than 0) distinguishes "not measurable here"
 * -- jsdom, or before first paint -- from "genuinely zero wide", so the caller
 * can fall back to a breakpoint instead of guessing wrong.
 *
 * Returns a *callback ref*, not a `RefObject`: the board's measured element is
 * mounted only once the query resolves, and an effect keyed on a ref object
 * would never re-run to observe it, leaving the width stuck at `null` forever.
 */
export function useElementWidth<T extends HTMLElement>(): [number | null, (node: T | null) => void] {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!element) return;

    const read = () => {
      const measured = element.getBoundingClientRect().width;
      setWidth(measured > 0 ? measured : null);
    };

    read();

    // Resizing the window is not the only thing that changes this: collapsing
    // the sidebar changes the content area without a viewport change.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read);
      return () => window.removeEventListener('resize', read);
    }

    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  // Reported as null while nothing is mounted, rather than clearing the stored
  // width from inside the effect.
  return [element ? width : null, setElement];
}
