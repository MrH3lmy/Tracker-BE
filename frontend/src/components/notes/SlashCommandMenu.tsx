/* eslint-disable react-refresh/only-export-components */
import type { NoteBlockType } from './noteTypes';
import { cn } from '../ui';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  blockType: NoteBlockType;
  placeholder?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'heading', label: '/heading', description: 'Turn this block into a heading.', blockType: 'heading' },
  { id: 'todo', label: '/todo', description: 'Create a checklist item.', blockType: 'checklist' },
  { id: 'bullet', label: '/bullet', description: 'Create a bulleted list item.', blockType: 'bullet' },
  { id: 'code', label: '/code', description: 'Create a code block.', blockType: 'code' },
  { id: 'quote', label: '/quote', description: 'Create a quote block.', blockType: 'quote' },
  { id: 'screenshot', label: '/screenshot', description: 'Add a screenshot reference block.', blockType: 'screenshot', placeholder: 'Screenshot URL or attachment reference' },
  { id: 'task', label: '/task', description: 'Create a task checklist block.', blockType: 'checklist' },
  { id: 'template', label: '/template', description: 'Insert a reusable note template starter.', blockType: 'paragraph', placeholder: '## Summary\n\n## Next steps' },
];

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (command: SlashCommand) => void;
}

// Note: this is a hand-styled listbox (matching the Menu primitive's visual
// language) rather than the Radix-backed Menu/MenuContent/MenuItem
// components. Those require a trigger element and manage their own open
// state; this menu's open/close and keyboard navigation (ArrowUp/Down,
// Enter, Escape) are driven entirely by the parent NoteBlockEditor's
// textarea keydown handler based on cursor position, which isn't compatible
// with Radix's trigger-driven model. Wiring it through Radix would require
// changing that interaction logic, which is out of scope for a visual pass.
export function SlashCommandMenu({
  commands,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: SlashCommandMenuProps) {
  if (commands.length === 0) {
    return (
      <div
        role="listbox"
        aria-label="Slash commands"
        className="absolute top-full left-0 z-(--z-dropdown) mt-1.5 w-[min(26rem,100%)] overflow-hidden rounded-lg border border-line bg-raised p-1 shadow-md"
      >
        <div className="px-2.5 py-1.5 text-sm text-fg-subtle">No matching commands</div>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Slash commands"
      className="absolute top-full left-0 z-(--z-dropdown) mt-1.5 max-h-72 w-[min(26rem,100%)] overflow-y-auto rounded-lg border border-line bg-raised p-1 shadow-md"
    >
      {commands.map((command, index) => (
        <button
          key={command.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseEnter={() => onActiveIndexChange(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(command)}
          className={cn(
            'flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-1.5 text-left text-sm outline-none select-none',
            index === activeIndex ? 'bg-inset text-fg' : 'text-fg',
          )}
        >
          <span className="font-medium text-fg">{command.label}</span>
          <span className="text-xs text-fg-muted">{command.description}</span>
        </button>
      ))}
    </div>
  );
}
