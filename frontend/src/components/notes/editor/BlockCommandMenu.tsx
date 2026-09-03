import { useEffect, useMemo, useRef } from 'react';
import { cn } from '../../ui';
import { filterBlockCommands, type BlockCommand } from './blockCommands';

interface BlockCommandMenuProps {
  /** Filter text typed after the "/" - empty when opened from the + button. */
  query: string;
  /**
   * The highlighted option, owned by the block that holds the caret. The palette is deliberately
   * controlled: the keyboard driver lives with the text field (so the caret never leaves it), and
   * a second copy of this index inside the menu would silently drift out of sync with it.
   */
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: BlockCommand) => void;
  /** Dismissal is driven from the owning field's Escape handler, not from inside the list. */
  onDismiss?: () => void;
}


/**
 * The block command palette, opened by typing "/" in a block or by the block's + button
 * (issue #299 follow-up). It is anchored inside the block row rather than floating at page level,
 * so it tracks the caret's block on scroll and on mobile without any positioning maths.
 *
 * Keyboard contract: ArrowUp/ArrowDown move the active option, Enter picks it, Escape dismisses.
 * The list is a `listbox` whose active option is reported through `aria-activedescendant`, so the
 * caret can stay in the block's text field while the menu is being driven.
 */
export function BlockCommandMenu({ query, activeIndex, onActiveIndexChange, onSelect }: BlockCommandMenuProps) {
  const commands = useMemo(() => filterBlockCommands(query), [query]);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const option = listRef.current?.querySelectorAll('[role="option"]')[activeIndex];
    // Guarded: scrollIntoView is absent in jsdom and in some older embedded webviews, and a
    // missing scroll must never break keyboard navigation of the palette.
    if (option instanceof HTMLElement && typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (commands.length === 0) {
    return (
      <div className="mt-1 rounded-lg border border-line bg-raised p-3 text-sm text-fg-muted shadow-md" role="status">
        No block matches “{query}”. Press Escape to keep typing.
      </div>
    );
  }

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Block commands"
      className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-raised p-1 shadow-md"
    >
      {commands.map((command, index) => {
        const Icon = command.icon;
        const active = index === activeIndex;
        return (
          <li key={command.id}>
            <button
              type="button"
              id={`block-command-${command.id}`}
              role="option"
              aria-selected={active}
              tabIndex={-1}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => {
                // Keep the caret in the block: mousedown would blur the textarea first.
                event.preventDefault();
                onSelect(command);
              }}
              className={cn(
                'flex w-full min-h-11 items-center gap-2.5 rounded-md px-2.5 text-left transition-colors duration-(--duration-fast)',
                active ? 'bg-brand-soft text-fg' : 'text-fg-muted hover:bg-inset',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">{command.label}</span>
                <span className="block truncate text-xs text-fg-subtle">{command.hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
