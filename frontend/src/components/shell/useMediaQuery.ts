import { useCallback, useSyncExternalStore } from 'react';

const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Subscribes to a CSS media query.
 *
 * The shell needs the *same* breakpoint in JS and CSS because the sidebar's
 * density changes its markup (a rail stacks its label under the icon, a full
 * sidebar sets it beside), which a class toggle alone cannot express without
 * rendering two navigation landmarks and hiding one.
 *
 * matchMedia is an external store, so this uses useSyncExternalStore rather
 * than an effect: it reads the current value during render (no first-paint
 * flash of the wrong density) and stays tear-free under concurrent rendering.
 *
 * Falls back to `false` where matchMedia is unavailable (SSR, older test
 * shims), which yields the rail -- the narrower, always-safe layout.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!hasMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => (hasMatchMedia() ? window.matchMedia(query).matches : false), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
