import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import type { NoteBlockType, NoteTaskLinkRecord } from '../noteTypes';
import { NoteBlockRow } from './NoteBlockRow';
import { filterBlockCommands, handleBlockCommandKey, type BlockCommand } from './blockCommands';
import { TEXTUAL_BLOCK_TYPES, makeBlock, type EditorBlock } from './editorBlocks';
import { Button } from '../../ui';
import { Plus } from '../../ui/icons';

interface NoteEditorCanvasProps {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  taskLinks: NoteTaskLinkRecord[];
  onConvertBlockToTask: (block: EditorBlock) => void;
  onRequestScreenshot: () => void;
  disabled?: boolean;
}

/** Matches a "/" that starts a command, i.e. at the start of the block or after whitespace. */
function slashQueryAt(value: string, caret: number): string | null {
  const before = value.slice(0, caret);
  const match = /(?:^|\s)\/([\w-]*)$/.exec(before);
  return match ? match[1] : null;
}

/**
 * The block canvas (issue #299 follow-up): the note *is* the editable surface.
 *
 * Keyboard model, which is what makes this feel like a document rather than a form:
 * - **Enter** splits at the caret: text after the caret moves into a new block below, and focus
 *   follows it. On a list/checklist block, Enter on an already-empty block exits the list by
 *   turning the block back into a paragraph instead of stacking empty items.
 * - **Backspace at offset 0** merges into the previous block and restores the caret to the join
 *   point, so deleting across a boundary reads as one continuous document. An empty block is
 *   removed outright. The first block is never removed - a document always has somewhere to type.
 * - **ArrowUp/ArrowDown** at the first/last line move between blocks, preserving the caret column
 *   where practical.
 * - **"/"** opens the command palette anchored to the block; the palette consumes ArrowUp,
 *   ArrowDown, Enter, Tab and Escape while it is open.
 */
export function NoteEditorCanvas({
  blocks,
  onChange,
  taskLinks,
  onConvertBlockToTask,
  onRequestScreenshot,
  disabled,
}: NoteEditorCanvasProps) {
  const [activeKey, setActiveKey] = useState<string | null>(blocks[0]?.key ?? null);
  const [slash, setSlash] = useState<{ key: string; query: string; activeIndex: number } | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const registerRef = useCallback((key: string, element: HTMLTextAreaElement | null) => {
    refs.current[key] = element;
  }, []);

  const focusBlock = useCallback((key: string, caret?: number) => {
    setActiveKey(key);
    window.requestAnimationFrame(() => {
      const element = refs.current[key];
      if (!element) return;
      element.focus({ preventScroll: false });
      const position = caret ?? element.value.length;
      element.setSelectionRange(position, position);
    });
  }, []);

  const replace = useCallback(
    (next: EditorBlock[]) => onChange(next.length === 0 ? [makeBlock('paragraph')] : next),
    [onChange],
  );

  const patchBlock = useCallback(
    (key: string, patch: Partial<EditorBlock>) => {
      replace(blocks.map((block) => (block.key === key ? { ...block, ...patch } : block)));
    },
    [blocks, replace],
  );

  const insertAfter = useCallback(
    (index: number, block: EditorBlock) => {
      const next = [...blocks];
      next.splice(index + 1, 0, block);
      replace(next);
      focusBlock(block.key, 0);
    },
    [blocks, focusBlock, replace],
  );

  const removeAt = useCallback(
    (index: number) => {
      if (blocks.length === 1) {
        // Never leave the document with nothing to type into.
        replace([{ ...blocks[0], type: 'paragraph', content: '', checked: false }]);
        focusBlock(blocks[0].key, 0);
        return;
      }
      const previous = blocks[index - 1] ?? blocks[index + 1];
      const next = blocks.filter((_, position) => position !== index);
      replace(next);
      if (previous) focusBlock(previous.key);
    },
    [blocks, focusBlock, replace],
  );

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= blocks.length || fromIndex === toIndex) return;
      const next = [...blocks];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      replace(next);
      focusBlock(moved.key);
    },
    [blocks, focusBlock, replace],
  );

  const applyCommand = useCallback(
    (index: number, command: BlockCommand) => {
      const block = blocks[index];
      // Strip the "/query" that opened the palette out of the block's text.
      const cleaned = (block.content ?? '').replace(/(?:^|\s)\/[\w-]*$/, '').trimEnd();
      setSlash(null);

      if (command.type === 'screenshot') {
        patchBlock(block.key, { content: cleaned });
        onRequestScreenshot();
        return;
      }

      const type = command.type as NoteBlockType;
      if (type === 'divider') {
        const next = [...blocks];
        next[index] = { ...block, content: cleaned };
        const divider = makeBlock('divider');
        const trailing = makeBlock('paragraph');
        next.splice(index + 1, 0, divider, trailing);
        replace(next);
        focusBlock(trailing.key, 0);
        return;
      }

      patchBlock(block.key, { type, content: cleaned });
      focusBlock(block.key, cleaned.length);
    },
    [blocks, focusBlock, onRequestScreenshot, patchBlock, replace],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
      const block = blocks[index];
      const element = event.currentTarget;
      const caret = element.selectionStart ?? 0;

      if (slash && slash.key === block.key) {
        const consumed = handleBlockCommandKey(
          event,
          { query: slash.query, activeIndex: slash.activeIndex },
          {
            setActiveIndex: (activeIndex) => setSlash((current) => (current ? { ...current, activeIndex } : current)),
            select: (command) => applyCommand(index, command),
            dismiss: () => setSlash(null),
          },
        );
        if (consumed) return;
      }

      if (event.key === 'Enter' && !event.shiftKey && block.type !== 'code') {
        event.preventDefault();
        const content = block.content ?? '';
        const before = content.slice(0, caret);
        const after = content.slice(caret);

        // Enter on an empty list item exits the list rather than stacking empties.
        if (content.trim() === '' && (block.type === 'bullet' || block.type === 'checklist' || block.type === 'quote')) {
          patchBlock(block.key, { type: 'paragraph', checked: false });
          focusBlock(block.key, 0);
          return;
        }

        // A new sibling continues a list; anything else drops back to a paragraph.
        const inheritsType = block.type === 'bullet' || block.type === 'checklist';
        const created = makeBlock(inheritsType ? block.type : 'paragraph', after);
        const next = [...blocks];
        next[index] = { ...block, content: before };
        next.splice(index + 1, 0, created);
        replace(next);
        focusBlock(created.key, 0);
        return;
      }

      if (event.key === 'Backspace' && caret === 0 && element.selectionEnd === 0) {
        const content = block.content ?? '';
        // A decorated empty block becomes a plain paragraph first - one Backspace to undo the
        // block type, a second to actually remove it.
        if (content === '' && block.type !== 'paragraph') {
          event.preventDefault();
          patchBlock(block.key, { type: 'paragraph', checked: false });
          return;
        }
        if (index === 0) return;
        event.preventDefault();
        const previous = blocks[index - 1];
        if (previous.type === 'divider') {
          replace(blocks.filter((_, position) => position !== index - 1));
          return;
        }
        const joinAt = (previous.content ?? '').length;
        const next = blocks
          .map((candidate, position) =>
            position === index - 1 ? { ...candidate, content: (candidate.content ?? '') + content } : candidate,
          )
          .filter((_, position) => position !== index);
        replace(next);
        focusBlock(previous.key, joinAt);
        return;
      }

      if (event.key === 'ArrowUp' && caret === 0 && index > 0) {
        event.preventDefault();
        focusBlock(blocks[index - 1].key);
        return;
      }
      if (event.key === 'ArrowDown' && caret === (block.content ?? '').length && index < blocks.length - 1) {
        event.preventDefault();
        focusBlock(blocks[index + 1].key, 0);
      }
    },
    [applyCommand, blocks, focusBlock, patchBlock, replace, slash],
  );

  const handleContentChange = useCallback(
    (index: number, value: string) => {
      const block = blocks[index];
      patchBlock(block.key, { content: value });

      const element = refs.current[block.key];
      const caret = element?.selectionStart ?? value.length;
      const query = TEXTUAL_BLOCK_TYPES.has(block.type) ? slashQueryAt(value, caret) : null;
      if (query === null) {
        setSlash((current) => (current && current.key === block.key ? null : current));
        return;
      }
      setSlash((current) =>
        current && current.key === block.key
          ? { ...current, query, activeIndex: Math.min(current.activeIndex, Math.max(filterBlockCommands(query).length - 1, 0)) }
          : { key: block.key, query, activeIndex: 0 },
      );
    },
    [blocks, patchBlock],
  );

  const taskLinkForBlock = useCallback(
    (block: EditorBlock) => (block.id == null ? undefined : taskLinks.find((link) => link.blockId === block.id)),
    [taskLinks],
  );

  return (
    <div className="flex flex-col gap-0.5" aria-label="Note content">
      {blocks.map((block, index) => (
        <NoteBlockRow
          key={block.key}
          block={block}
          index={index}
          total={blocks.length}
          isActive={activeKey === block.key}
          slashQuery={slash && slash.key === block.key ? slash.query : null}
          slashActiveIndex={slash?.activeIndex ?? 0}
          onSlashActiveIndexChange={(activeIndex) => setSlash((current) => (current ? { ...current, activeIndex } : current))}
          onSelectCommand={(command) => applyCommand(index, command)}
          onDismissSlash={() => setSlash(null)}
          onChange={(value) => handleContentChange(index, value)}
          onToggleChecked={() => patchBlock(block.key, { checked: !block.checked })}
          onFocus={() => setActiveKey(block.key)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onInsertAfter={() => {
            const created = makeBlock('paragraph');
            insertAfter(index, created);
            setSlash({ key: created.key, query: '', activeIndex: 0 });
          }}
          onTurnInto={(type) => patchBlock(block.key, { type, checked: type === 'checklist' ? block.checked : false })}
          onDuplicate={() => insertAfter(index, { ...block, key: makeBlock().key, id: null })}
          onMove={(delta) => moveBlock(index, index + delta)}
          onDelete={() => removeAt(index)}
          onConvertToTask={() => onConvertBlockToTask(block)}
          taskLink={taskLinkForBlock(block)}
          registerRef={registerRef}
          disabled={disabled}
          isDropTarget={dropTargetKey === block.key && draggingKey !== block.key}
          dragHandleProps={{
            draggable: !disabled,
            onDragStart: () => setDraggingKey(block.key),
            onDragEnd: () => {
              setDraggingKey(null);
              setDropTargetKey(null);
            },
          }}
          containerDropProps={{
            onDragOver: (event) => {
              if (!draggingKey) return;
              event.preventDefault();
              setDropTargetKey(block.key);
            },
            onDrop: (event) => {
              if (!draggingKey) return;
              event.preventDefault();
              const from = blocks.findIndex((candidate) => candidate.key === draggingKey);
              if (from >= 0) moveBlock(from, index);
              setDraggingKey(null);
              setDropTargetKey(null);
            },
          }}
        />
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="mt-2 self-start text-fg-subtle"
        disabled={disabled}
        onClick={() => {
          const created = makeBlock('paragraph');
          insertAfter(blocks.length - 1, created);
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add a block
      </Button>
    </div>
  );
}
