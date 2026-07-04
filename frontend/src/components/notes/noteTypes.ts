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
}


export type NoteBlockType = 'paragraph' | 'heading' | 'checklist' | 'bullet' | 'code' | 'quote' | 'divider' | 'screenshot';

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
}
