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

export function NoteBlockEditor({ blocks, onChange, disabled }: NoteBlockEditorProps) {
  const updateBlock = (clientId: string, patch: Partial<DraftNoteBlock>) => onChange(blocks.map((block) => block.clientId === clientId ? { ...block, ...patch } : block));
  const removeBlock = (clientId: string) => onChange(blocks.filter((block) => block.clientId !== clientId));
  const moveBlock = (index: number, delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    const [block] = next.splice(index, 1);
    next.splice(nextIndex, 0, block);
    onChange(next);
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
        {block.type === 'divider' ? <p className="muted">Divider blocks do not need content.</p> : <textarea className="text-block" rows={block.type === 'code' ? 6 : 3} value={block.content ?? ''} disabled={disabled} placeholder={block.type === 'screenshot' ? 'Screenshot URL or attachment reference' : 'Block content'} onChange={(event) => updateBlock(block.clientId, { content: event.target.value })} />}
        <input value={block.metadata ?? ''} disabled={disabled} placeholder="Optional metadata JSON" onChange={(event) => updateBlock(block.clientId, { metadata: event.target.value })} />
      </div>)}
    </div>
  </div>;
}
