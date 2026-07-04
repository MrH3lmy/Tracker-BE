/* eslint-disable react-refresh/only-export-components */
import type { NoteBlockType } from './noteTypes';

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

export function SlashCommandMenu({
  commands,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: SlashCommandMenuProps) {
  if (commands.length === 0) {
    return (
      <div className="slash-command-menu" role="listbox" aria-label="Slash commands">
        <div className="slash-command-menu__empty">No matching commands</div>
      </div>
    );
  }

  return (
    <div className="slash-command-menu" role="listbox" aria-label="Slash commands">
      {commands.map((command, index) => (
        <button
          key={command.id}
          type="button"
          className={`slash-command-menu__item${index === activeIndex ? ' slash-command-menu__item--active' : ''}`}
          role="option"
          aria-selected={index === activeIndex}
          onMouseEnter={() => onActiveIndexChange(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(command)}
        >
          <span className="slash-command-menu__label">{command.label}</span>
          <span className="slash-command-menu__description">{command.description}</span>
        </button>
      ))}
    </div>
  );
}
