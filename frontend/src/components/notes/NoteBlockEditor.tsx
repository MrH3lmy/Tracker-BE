/* eslint-disable react-refresh/only-export-components */
import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { SlashCommandMenu, SLASH_COMMANDS, type SlashCommand } from './SlashCommandMenu';
import type { NoteBlockRecord, NoteBlockType } from './noteTypes';

const BLOCK_TYPES: NoteBlockType[] = ['paragraph', 'heading', 'checklist', 'bullet', 'code', 'quote', 'divider', 'screenshot'];

export interface DraftNoteBlock extends Pick<NoteBlockRecord, 'type' | 'content' | 'checked' | 'metadata'> {
  clientId: string;
}

interface NoteBlockEditorProps {
  blocks: DraftNoteBlock[];
  onChange: (blocks: DraftNoteBlock[]) => void;
  disabled?: boolean;
}

const newBlock = (type: NoteBlockType = 'paragraph'): DraftNoteBlock => ({
  clientId: crypto.randomUUID(),
  type,
  content: '',
  checked: false,
  metadata: '',
});

export const blocksFromBody = (body: string): DraftNoteBlock[] => {
  const lines = body.split(/\n{2,}/).map((line) => line.trim()).filter(Boolean);
  return (lines.length ? lines : ['']).map((content) => ({ ...newBlock('paragraph'), content }));
};

export const bodyFromBlocks = (blocks: DraftNoteBlock[]): string => blocks
  .map((block) => {
    if (block.type === 'divider') return '---';
    if (block.type === 'checklist') return `${block.checked ? '[x]' : '[ ]'} ${block.content ?? ''}`.trim();
    if (block.type === 'bullet') return `- ${block.content ?? ''}`.trim();
    if (block.type === 'heading') return `# ${block.content ?? ''}`.trim();
    if (block.type === 'quote') return `> ${block.content ?? ''}`.trim();
    return block.content ?? '';
  })
  .join('\n\n')
  .trim();

const getSlashCommandMatch = (value: string, cursorPosition: number) => {
  const textBeforeCursor = value.slice(0, cursorPosition);
  const match = /(?:^|\s)\/(\w*)$/.exec(textBeforeCursor);

  if (!match || match.index === undefined) return null;

  return {
    query: match[1].toLowerCase(),
    start: match.index + (match[0].startsWith(' ') ? 1 : 0),
    end: cursorPosition,
  };
};

export function NoteBlockEditor({ blocks, onChange, disabled }: NoteBlockEditorProps) {
  const [slashMenu, setSlashMenu] = useState<{ clientId: string; query: string; start: number; end: number; activeIndex: number } | null>(null);
  const textAreaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const updateBlock = (clientId: string, patch: Partial<DraftNoteBlock>) => onChange(blocks.map((block) => block.clientId === clientId ? { ...block, ...patch } : block));
  const removeBlock = (clientId: string) => onChange(blocks.filter((block) => block.clientId !== clientId));
  const filteredSlashCommands = useMemo(() => {
    if (!slashMenu) return [];

    return SLASH_COMMANDS.filter((command) =>
      command.id.startsWith(slashMenu.query) || command.label.slice(1).startsWith(slashMenu.query),
    );
  }, [slashMenu]);

  const moveBlock = (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    const [block] = next.splice(index, 1);
    next.splice(nextIndex, 0, block);
    onChange(next);
  };

  const closeSlashMenu = () => setSlashMenu(null);

  const updateSlashMenuFromTextArea = (clientId: string, textarea: HTMLTextAreaElement) => {
    const match = getSlashCommandMatch(textarea.value, textarea.selectionStart);
    if (!match) {
      closeSlashMenu();
      return;
    }

    setSlashMenu({ clientId, ...match, activeIndex: 0 });
  };

  const handleTextChange = (block: DraftNoteBlock, event: ChangeEvent<HTMLTextAreaElement>) => {
    updateBlock(block.clientId, { content: event.target.value });
    updateSlashMenuFromTextArea(block.clientId, event.target);
  };

  const applySlashCommand = (block: DraftNoteBlock, command: SlashCommand) => {
    const textarea = textAreaRefs.current[block.clientId];
    const content = block.content ?? '';
    const activeMenu = slashMenu?.clientId === block.clientId ? slashMenu : null;
    const match = activeMenu ?? (textarea ? getSlashCommandMatch(content, textarea.selectionStart) : null);
    const start = match?.start ?? 0;
    const end = match?.end ?? content.length;
    const prefix = content.slice(0, start);
    const suffix = content.slice(end);
    const placeholder = command.placeholder ?? '';
    const nextContent = `${prefix}${placeholder}${suffix}`;

    updateBlock(block.clientId, {
      type: command.blockType,
      content: nextContent,
      checked: command.blockType === 'checklist' ? false : block.checked,
    });
    closeSlashMenu();

    window.setTimeout(() => {
      const cursorPosition = start + placeholder.length;
      textAreaRefs.current[block.clientId]?.focus();
      textAreaRefs.current[block.clientId]?.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const handleTextKeyDown = (block: DraftNoteBlock, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slashMenu || slashMenu.clientId !== block.clientId) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeSlashMenu();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredSlashCommands.length === 0) return;

      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setSlashMenu((current) => current && current.clientId === block.clientId
        ? { ...current, activeIndex: (current.activeIndex + direction + filteredSlashCommands.length) % filteredSlashCommands.length }
        : current);
      return;
    }

    if (event.key === 'Enter') {
      if (filteredSlashCommands.length === 0) return;

      event.preventDefault();
      applySlashCommand(block, filteredSlashCommands[slashMenu.activeIndex] ?? filteredSlashCommands[0]);
    }
  };

  return <div className="panel" style={{ padding: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
    <div className="section-header">
      <div>
        <strong>Block editor</strong>
        <p className="muted">Body text is preserved as a fallback while blocks are introduced.</p>
      </div>
      <button type="button" disabled={disabled} onClick={() => onChange([...blocks, newBlock()])}>Add block</button>
    </div>
    <div className="stacked-list">
      {blocks.map((block, index) => <div key={block.clientId} className="panel" style={{ padding: 'var(--space-3)' }}>
        <div className="row compact-row">
          <select value={block.type} disabled={disabled} onChange={(event) => updateBlock(block.clientId, { type: event.target.value as NoteBlockType })}>
            {BLOCK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <button type="button" disabled={disabled || index === 0} onClick={() => moveBlock(index, -1)}>Up</button>
          <button type="button" disabled={disabled || index === blocks.length - 1} onClick={() => moveBlock(index, 1)}>Down</button>
          <button type="button" disabled={disabled || blocks.length === 1} onClick={() => removeBlock(block.clientId)}>Remove</button>
        </div>
        {block.type === 'checklist' ? <label className="row compact-row"><input type="checkbox" checked={Boolean(block.checked)} disabled={disabled} onChange={(event) => updateBlock(block.clientId, { checked: event.target.checked })} /> Checked</label> : null}
        {block.type === 'divider' ? <p className="muted">Divider blocks do not need content.</p> : <div className="slash-command-anchor">
          <textarea
            ref={(element) => { textAreaRefs.current[block.clientId] = element; }}
            className="text-block"
            rows={block.type === 'code' ? 6 : 3}
            value={block.content ?? ''}
            disabled={disabled}
            placeholder={block.type === 'screenshot' ? 'Screenshot URL or attachment reference' : 'Type / for commands'}
            onChange={(event) => handleTextChange(block, event)}
            onKeyDown={(event) => handleTextKeyDown(block, event)}
            onSelect={(event) => {
              if (slashMenu?.clientId === block.clientId) {
                updateSlashMenuFromTextArea(block.clientId, event.currentTarget);
              }
            }}
          />
          {slashMenu?.clientId === block.clientId ? (
            <SlashCommandMenu
              commands={filteredSlashCommands}
              activeIndex={Math.min(slashMenu.activeIndex, Math.max(filteredSlashCommands.length - 1, 0))}
              onActiveIndexChange={(activeIndex) => setSlashMenu((current) => current ? { ...current, activeIndex } : current)}
              onSelect={(command) => applySlashCommand(block, command)}
            />
          ) : null}
        </div>}
        <input value={block.metadata ?? ''} disabled={disabled} placeholder="Optional metadata JSON" onChange={(event) => updateBlock(block.clientId, { metadata: event.target.value })} />
      </div>)}
    </div>
  </div>;
}
