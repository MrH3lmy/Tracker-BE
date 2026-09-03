import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import type { NoteBlockType, NoteTaskLinkRecord } from '../noteTypes';
import { BlockCommandMenu } from './BlockCommandMenu';
import type { BlockCommand } from './blockCommands';
import type { EditorBlock } from './editorBlocks';
import { Badge, Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, cn } from '../../ui';
import { Check, ChevronDown, ChevronUp, CopyPlus, GripVertical, Plus, Trash2 } from '../../ui/icons';

const TYPE_LABELS: Record<NoteBlockType, string> = {
  paragraph: 'Text',
  heading: 'Heading',
  bullet: 'Bullet list',
  checklist: 'Checklist',
  quote: 'Quote',
  code: 'Code',
  divider: 'Divider',
  screenshot: 'Screenshot',
};

const TURN_INTO_TYPES: NoteBlockType[] = ['paragraph', 'heading', 'bullet', 'checklist', 'quote', 'code'];

interface NoteBlockRowProps {
  block: EditorBlock;
  index: number;
  total: number;
  isActive: boolean;
  slashQuery: string | null;
  slashActiveIndex: number;
  onSlashActiveIndexChange: (index: number) => void;
  onSelectCommand: (command: BlockCommand) => void;
  onDismissSlash: () => void;
  onChange: (content: string) => void;
  onToggleChecked: () => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onInsertAfter: () => void;
  onTurnInto: (type: NoteBlockType) => void;
  onDuplicate: () => void;
  onMove: (delta: number) => void;
  onDelete: () => void;
  onConvertToTask: () => void;
  taskLink?: NoteTaskLinkRecord;
  registerRef: (key: string, element: HTMLTextAreaElement | null) => void;
  dragHandleProps: {
    draggable: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
  };
  containerDropProps: {
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
  };
  isDropTarget: boolean;
  disabled?: boolean;
}

/** Auto-grows the textarea so a block never scrolls inside a fixed-height box. */
function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [ref, value]);
}

const CONTENT_CLASSES: Record<string, string> = {
  paragraph: 'text-[15px] leading-relaxed',
  heading: 'text-xl font-semibold leading-snug',
  bullet: 'text-[15px] leading-relaxed',
  checklist: 'text-[15px] leading-relaxed',
  quote: 'text-[15px] leading-relaxed italic',
  code: 'font-mono text-[13px] leading-relaxed',
};

const PLACEHOLDERS: Record<string, string> = {
  paragraph: 'Start writing, or type "/" for commands...',
  heading: 'Heading',
  bullet: 'List item',
  checklist: 'Action item',
  quote: 'Quote',
  code: 'Code',
};

/**
 * One block in the document (issue #299 follow-up).
 *
 * The content is the only thing rendered at full weight; the drag handle, the insert button and
 * the block menu sit in a gutter and fade in on hover or focus. They are always in the DOM and
 * always focusable, never `display:none` - the tool's `Compact Control Semantics` result is
 * explicit that revealing the only path to an action on hover is a Critical failure, so every
 * gutter action also exists inside the block menu, which is reachable by keyboard.
 */
export function NoteBlockRow({
  block, index, total, isActive, slashQuery, slashActiveIndex, onSlashActiveIndexChange, onSelectCommand, onDismissSlash,
  onChange, onToggleChecked, onFocus, onKeyDown, onInsertAfter, onTurnInto, onDuplicate, onMove, onDelete,
  onConvertToTask, taskLink, registerRef, dragHandleProps, containerDropProps, isDropTarget, disabled,
}: NoteBlockRowProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useAutoGrow(textareaRef, block.content);

  const isDivider = block.type === 'divider';
  const label = TYPE_LABELS[block.type] ?? block.type;

  return (
    <div
      data-block-key={block.key}
      data-block-type={block.type}
      className={cn(
        'group relative flex items-start gap-1 rounded-md',
        isDropTarget && 'ring-2 ring-brand',
      )}
      {...containerDropProps}
    >
      {/* Gutter: insert + drag. Opacity-only reveal so layout never shifts. */}
      <div
        className={cn(
          'flex shrink-0 items-center gap-0.5 pt-1 opacity-0 transition-opacity duration-(--duration-fast)',
          'group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100',
          isActive && 'opacity-100',
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={`Insert a block after ${label} block ${index + 1}`}
          onClick={onInsertAfter}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
        <span
          {...dragHandleProps}
          role="button"
          tabIndex={-1}
          aria-hidden="true"
          title="Drag to reorder — or use the block menu"
          className="inline-flex h-8 w-5 cursor-grab items-center justify-center rounded-md text-fg-subtle hover:bg-inset active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        {isDivider ? (
          <div className="flex min-h-11 items-center" aria-label="Divider block">
            <hr className="w-full border-t border-line" />
          </div>
        ) : (
          <div className="flex min-w-0 items-start gap-2">
            {block.type === 'checklist' ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={block.checked}
                aria-label={`Mark "${block.content || 'action item'}" as ${block.checked ? 'not done' : 'done'}`}
                onClick={onToggleChecked}
                disabled={disabled}
                className={cn(
                  'mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-xs border transition-colors duration-(--duration-fast)',
                  block.checked ? 'border-positive bg-positive-soft text-positive' : 'border-line-strong hover:border-brand',
                )}
              >
                {block.checked ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              </button>
            ) : null}
            {block.type === 'bullet' ? (
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
            ) : null}

            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={`block-${block.key}`}>
                {label} block {index + 1} of {total}
              </label>
              <textarea
                id={`block-${block.key}`}
                ref={(element) => {
                  textareaRef.current = element;
                  registerRef(block.key, element);
                }}
                rows={1}
                value={block.content}
                placeholder={isActive ? PLACEHOLDERS[block.type] ?? '' : ''}
                disabled={disabled}
                onFocus={onFocus}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={onKeyDown}
                aria-expanded={slashQuery !== null}
                aria-controls={slashQuery !== null ? `block-commands-${block.key}` : undefined}
                aria-activedescendant={slashQuery !== null ? `block-command-${slashActiveIndex}` : undefined}
                className={cn(
                  'w-full resize-none overflow-hidden border-0 bg-transparent px-0 py-1 text-fg outline-none placeholder:text-fg-subtle focus-visible:ring-0',
                  CONTENT_CLASSES[block.type] ?? CONTENT_CLASSES.paragraph,
                  block.type === 'quote' && 'border-l-2 border-line-strong pl-3',
                  block.type === 'code' && 'rounded-md bg-inset px-3',
                  block.checked && block.type === 'checklist' && 'text-fg-subtle line-through',
                )}
              />

              {slashQuery !== null ? (
                <div id={`block-commands-${block.key}`}>
                  <BlockCommandMenu
                    query={slashQuery}
                    activeIndex={slashActiveIndex}
                    onActiveIndexChange={onSlashActiveIndexChange}
                    onSelect={onSelectCommand}
                    onDismiss={onDismissSlash}
                  />
                </div>
              ) : null}

              {block.type === 'checklist' && taskLink ? (
                <Link to={`/tasks/${taskLink.taskId}`} className="mt-1 inline-block">
                  <Badge variant="positive">
                    <Check className="h-3 w-3" aria-hidden />
                    Task created · #{taskLink.taskId}
                  </Badge>
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'shrink-0 pt-1 opacity-0 transition-opacity duration-(--duration-fast)',
          'group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100',
          isActive && 'opacity-100',
        )}
      >
        <Menu>
          <MenuTrigger asChild>
            <Button variant="ghost" size="sm" iconOnly aria-label={`Block options for ${label} block ${index + 1}`} disabled={disabled}>
              <ChevronDown className="h-4 w-4" aria-hidden />
            </Button>
          </MenuTrigger>
          <MenuContent aria-label={`Options for ${label} block ${index + 1}`}>
            <MenuLabel>Turn into</MenuLabel>
            {TURN_INTO_TYPES.filter((type) => type !== block.type).map((type) => (
              <MenuItem key={type} onSelect={() => onTurnInto(type)}>
                {TYPE_LABELS[type]}
              </MenuItem>
            ))}
            <MenuSeparator />
            {block.type === 'checklist' && !taskLink ? (
              <MenuItem onSelect={onConvertToTask}>Convert to task</MenuItem>
            ) : null}
            <MenuItem onSelect={onDuplicate}>
              <CopyPlus className="h-4 w-4" aria-hidden />
              Duplicate
            </MenuItem>
            {/* Keyboard-reachable reordering: dragging is never the only path. */}
            <MenuItem onSelect={() => onMove(-1)} disabled={index === 0}>
              <ChevronUp className="h-4 w-4" aria-hidden />
              Move up
            </MenuItem>
            <MenuItem onSelect={() => onMove(1)} disabled={index === total - 1}>
              <ChevronDown className="h-4 w-4" aria-hidden />
              Move down
            </MenuItem>
            <MenuSeparator />
            <MenuItem destructive onSelect={onDelete}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </div>
  );
}
