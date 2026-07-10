import { useRef } from 'react';

/**
 * Dialog and Drawer are used fully controlled (no Radix Trigger), so Radix
 * has no trigger to restore focus to on close. Capture the element that was
 * focused as the overlay opens and send focus back there ourselves.
 */
export function useReturnFocus() {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault();
      returnFocusRef.current?.focus();
      returnFocusRef.current = null;
    },
  };
}
