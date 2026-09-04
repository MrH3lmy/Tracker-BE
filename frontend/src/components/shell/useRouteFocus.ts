import { useEffect, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * `focus-on-route-change` (WCAG): after a client-side route change, focus must
 * move to the main content region. Without it a screen-reader or keyboard user
 * navigates, hears nothing, and resumes tabbing from wherever the old page left
 * the focus -- usually back at the top of the navigation.
 *
 * The previous shell set `tabIndex={-1}` on <main> but never focused it, so the
 * affordance existed and did nothing.
 *
 * The very first render is skipped: moving focus on load would strip it from a
 * deep-linked page and fight the browser's own fragment handling.
 */
export function useRouteFocus(
  mainRef: RefObject<HTMLElement | null>,
  announce: (message: string) => void,
  routeLabel: string,
) {
  const { pathname } = useLocation();

  useEffect(() => {
    const isFirstRender = mainRef.current?.dataset.routeFocusReady !== 'true';
    if (mainRef.current) mainRef.current.dataset.routeFocusReady = 'true';
    if (isFirstRender) return;

    mainRef.current?.focus({ preventScroll: true });
    // A visible page title change is not announced by itself on a SPA route
    // change; the shell's live region carries it.
    announce(`${routeLabel} page loaded`);
  }, [announce, mainRef, pathname, routeLabel]);
}
