import type { NoteBlockRecord, NoteBlockType, NoteRecord } from '../noteTypes';

/**
 * A block as the editor holds it.
 *
 * `key` is a client-only identity that survives every edit, so React keys and focus targets stay
 * stable even before a block has ever been saved. `id` is the real `note_blocks.id`, present only
 * once the server has seen the block; it is what gets sent back so the backend updates that row
 * in place (preserving any ACTION_ITEM_CONVERSION task link) rather than deleting and reinserting.
 */
export interface EditorBlock {
  key: string;
  id: number | null;
  type: NoteBlockType;
  content: string;
  checked: boolean;
}

export const EDITABLE_BLOCK_TYPES: NoteBlockType[] = [
  'paragraph',
  'heading',
  'bullet',
  'checklist',
  'quote',
  'code',
  'divider',
];

/** Types whose content is a text field the caret can sit in. */
export const TEXTUAL_BLOCK_TYPES = new Set<NoteBlockType>([
  'paragraph',
  'heading',
  'bullet',
  'checklist',
  'quote',
  'code',
]);

let keyCounter = 0;
export function nextBlockKey(): string {
  keyCounter += 1;
  return `b${keyCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeBlock(type: NoteBlockType = 'paragraph', content = ''): EditorBlock {
  return { key: nextBlockKey(), id: null, type, content, checked: false };
}

/**
 * Blocks a note actually has on the server. A note that has only ever been edited through the old
 * flat-body form has none, so we fall back to parsing its `body` - that parse is the only way such
 * a note can be opened in the block editor at all, and once it is saved the blocks become real
 * rows with real ids.
 */
export function blocksFromNote(note: Pick<NoteRecord, 'blocks' | 'body'>): EditorBlock[] {
  const persisted = note.blocks ?? [];
  if (persisted.length > 0) {
    return [...persisted]
      .sort((first, second) => first.position - second.position || first.id - second.id)
      .map((block: NoteBlockRecord) => ({
        key: nextBlockKey(),
        id: block.id,
        type: block.type,
        content: block.content ?? '',
        checked: Boolean(block.checked),
      }));
  }
  return blocksFromBodyText(note.body ?? '');
}

/**
 * Best-effort parse of a flat body into blocks, mirroring the markers `bodyFromBlocks` writes so a
 * body this editor produced round-trips exactly. Anything else lands as paragraphs, which is
 * lossless for the text itself.
 */
export function blocksFromBodyText(body: string): EditorBlock[] {
  const chunks = body.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  if (chunks.length === 0) return [makeBlock('paragraph')];

  return chunks.map((chunk) => {
    if (chunk === '---') return makeBlock('divider');
    const checklist = /^\[( |x|X)\]\s?(.*)$/s.exec(chunk);
    if (checklist) {
      const block = makeBlock('checklist', checklist[2]);
      block.checked = checklist[1].toLowerCase() === 'x';
      return block;
    }
    const heading = /^#{1,6}\s+(.*)$/s.exec(chunk);
    if (heading) return makeBlock('heading', heading[1]);
    const bullet = /^[-*]\s+(.*)$/s.exec(chunk);
    if (bullet) return makeBlock('bullet', bullet[1]);
    const quote = /^>\s?(.*)$/s.exec(chunk);
    if (quote) return makeBlock('quote', quote[1]);
    return makeBlock('paragraph', chunk);
  });
}

/**
 * The flat `body` string the rest of the app still reads - search, note cards, previews, exports
 * and the AI actions all work off it, so the editor keeps it in sync with the blocks on every
 * save rather than letting the two representations drift.
 */
export function bodyFromBlocks(blocks: EditorBlock[]): string {
  return blocks
    .map((block) => {
      const content = block.content ?? '';
      switch (block.type) {
        case 'divider':
          return '---';
        case 'checklist':
          return `[${block.checked ? 'x' : ' '}] ${content}`.trim();
        case 'bullet':
          return `- ${content}`.trim();
        case 'heading':
          return `# ${content}`.trim();
        case 'quote':
          return `> ${content}`.trim();
        default:
          return content;
      }
    })
    .filter((line, _index, all) => line.length > 0 || all.length === 1)
    .join('\n\n')
    .trim();
}

/** The payload shape `UpdateNoteRequest.blocks` expects; position comes from array order. */
export function blocksToPayload(blocks: EditorBlock[]) {
  return blocks.map((block) => ({
    id: block.id,
    type: block.type,
    content: block.content ?? '',
    checked: Boolean(block.checked),
  }));
}

/**
 * Correlates the ids the server assigned with the **client blocks that were actually sent**,
 * keyed by `EditorBlock.key`.
 *
 * Correlating the response with the *current* document by array position is unsafe: if the user
 * reorders or inserts while the request is in flight, position N of the response and position N of
 * the current document are different blocks, and an id would be pinned onto the wrong one. Two
 * blocks could then carry the same id, making the next id-preserving diff write one server row
 * twice and delete the other - destroying exactly the row (and any ACTION_ITEM_CONVERSION link)
 * that the diff exists to protect.
 *
 * Sent-to-saved position correlation *is* safe, because the server assigns `position` from the
 * order of the array it was given. If the lengths disagree the response cannot be correlated at
 * all, so nothing is claimed.
 */
export function serverIdsByBlockKey(
  sentBlocks: EditorBlock[],
  saved: NoteBlockRecord[] | undefined,
): Map<string, number> {
  const idsByKey = new Map<string, number>();
  if (!saved || saved.length !== sentBlocks.length) return idsByKey;

  const ordered = [...saved].sort((first, second) => first.position - second.position || first.id - second.id);
  sentBlocks.forEach((block, index) => {
    if (block.id === null) idsByKey.set(block.key, ordered[index].id);
  });
  return idsByKey;
}

/**
 * Merges newly assigned ids into whatever the document looks like *now*, matched by client key.
 * A block that has moved, or been typed into, still gets its own id; a block the user deleted
 * meanwhile simply is not there to receive one. Content is never adopted from the server.
 */
export function applyServerIds(blocks: EditorBlock[], idsByKey: Map<string, number>): EditorBlock[] {
  if (idsByKey.size === 0) return blocks;
  return blocks.map((block) =>
    block.id === null && idsByKey.has(block.key) ? { ...block, id: idsByKey.get(block.key)! } : block,
  );
}

export function isEmptyDocument(blocks: EditorBlock[]): boolean {
  return blocks.every((block) => block.type !== 'divider' && (block.content ?? '').trim() === '');
}
