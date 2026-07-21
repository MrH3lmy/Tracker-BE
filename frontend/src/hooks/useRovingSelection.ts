import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';

/** Arrow-key/Enter navigation over a flat list, e.g. search results in a listbox. */
export function useRovingSelection<T>(items: T[], getItemKey: (item: T) => string, onSelect: (item: T) => void) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemsKey = useMemo(() => items.map(getItemKey).join('|'), [items, getItemKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the selection cursor when the underlying result set changes, not deriving render state.
    setActiveIndex(0);
  }, [itemsKey]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (items.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + items.length) % items.length);
    } else if (event.key === 'Enter') {
      const active = items[activeIndex];
      if (active) {
        event.preventDefault();
        onSelect(active);
      }
    }
  };

  return { activeIndex, setActiveIndex, onKeyDown };
}
