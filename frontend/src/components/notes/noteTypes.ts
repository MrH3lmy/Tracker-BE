export type NoteContentType = 'PLAIN_TEXT' | 'MARKDOWN' | 'SHELL_COMMANDS' | 'XML' | 'JSON';

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
  createdAt?: string;
  updatedAt?: string;
}
