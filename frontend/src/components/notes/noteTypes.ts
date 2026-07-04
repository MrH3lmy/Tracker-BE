export type NoteContentType = 'PLAIN_TEXT' | 'MARKDOWN' | 'SHELL_COMMANDS' | 'XML' | 'JSON';

export interface NoteAttachmentRecord {
  id: number;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: 'SCREENSHOT';
  caption?: string | null;
  source?: string | null;
  width?: number | null;
  height?: number | null;
  downloadUrl?: string | null;
  createdAt?: string;
}

export interface NoteRecord {
  id: number;
  title: string;
  body: string;
  contentType: NoteContentType;
  taskId?: number | null;
  displayOrder?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  width?: number | null;
  height?: number | null;
  color?: string | null;
  zIndex?: number | null;
  tags?: string[];
  attachments?: NoteAttachmentRecord[];
  createdAt?: string;
  updatedAt?: string;
  taskLinks?: NoteTaskLinkRecord[];
}


export type NoteBlockType = 'paragraph' | 'heading' | 'checklist' | 'bullet' | 'code' | 'quote' | 'divider' | 'screenshot';

export interface NoteTaskLinkRecord {
  id: number;
  noteId: number;
  blockId?: number | null;
  taskId: number;
  taskTitle?: string;
  noteTitle?: string;
  selectedText?: string | null;
  linkType?: string;
  createdAt?: string;
}

export interface NoteBlockRecord {
  id: number;
  noteId: number;
  type: NoteBlockType;
  content?: string | null;
  position: number;
  checked: boolean;
  metadata?: string | null;
  createdAt?: string;
  updatedAt?: string;
  taskLinks?: NoteTaskLinkRecord[];
}


export interface NoteTemplateRecord {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  content: string;
  blocksJson?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
