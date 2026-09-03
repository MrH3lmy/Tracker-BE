/**
 * Block command vocabulary and the keyboard driver for the palette (issue #299 follow-up).
 * Kept out of the component file so the constants and the key handler can be imported and
 * unit-tested without pulling in a React component.
 */
import type { ComponentType, KeyboardEvent } from 'react';
import type { NoteBlockType } from '../noteTypes';
import { Camera, Code, Heading, List, ListTodo, Minus, Quote, Type } from '../../ui/icons';

export interface BlockCommand {
  id: string;
  label: string;
  hint: string;
  type: NoteBlockType | 'screenshot';
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  keywords: string[];
}

export const BLOCK_COMMANDS: BlockCommand[] = [
  { id: 'text', label: 'Text', hint: 'Plain paragraph', type: 'paragraph', icon: Type, keywords: ['text', 'paragraph', 'p'] },
  { id: 'heading', label: 'Heading', hint: 'Section title', type: 'heading', icon: Heading, keywords: ['heading', 'title', 'h1'] },
  { id: 'bullet', label: 'Bullet list', hint: 'Unordered item', type: 'bullet', icon: List, keywords: ['bullet', 'list', 'ul'] },
  { id: 'checklist', label: 'Checklist', hint: 'Action item you can convert to a task', type: 'checklist', icon: ListTodo, keywords: ['check', 'todo', 'task', 'action'] },
  { id: 'quote', label: 'Quote', hint: 'Callout or citation', type: 'quote', icon: Quote, keywords: ['quote', 'callout'] },
  { id: 'code', label: 'Code', hint: 'Monospaced snippet', type: 'code', icon: Code, keywords: ['code', 'snippet', 'pre'] },
  { id: 'divider', label: 'Divider', hint: 'Horizontal rule', type: 'divider', icon: Minus, keywords: ['divider', 'rule', 'hr'] },
  { id: 'screenshot', label: 'Screenshot', hint: 'Attach an image to this note', type: 'screenshot', icon: Camera, keywords: ['screenshot', 'image', 'attachment', 'photo'] },
];


export function filterBlockCommands(query: string): BlockCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return BLOCK_COMMANDS;
  return BLOCK_COMMANDS.filter(
    (command) => command.label.toLowerCase().includes(needle) || command.keywords.some((keyword) => keyword.startsWith(needle)),
  );
}

/**
 * Drives the menu from the key events of whatever field owns the caret, so the text field never
 * loses focus while the menu is open. Returns true when the key was consumed.
 */
export function handleBlockCommandKey(
  event: KeyboardEvent,
  state: { query: string; activeIndex: number },
  actions: {
    setActiveIndex: (index: number) => void;
    select: (command: BlockCommand) => void;
    dismiss: () => void;
  },
): boolean {
  const commands = filterBlockCommands(state.query);
  if (event.key === 'Escape') {
    event.preventDefault();
    actions.dismiss();
    return true;
  }
  if (commands.length === 0) return false;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    actions.setActiveIndex((state.activeIndex + 1) % commands.length);
    return true;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    actions.setActiveIndex((state.activeIndex - 1 + commands.length) % commands.length);
    return true;
  }
  if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault();
    actions.select(commands[Math.min(state.activeIndex, commands.length - 1)]);
    return true;
  }
  return false;
}
