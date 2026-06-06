export type NoteContentType = 'PLAIN_TEXT' | 'MARKDOWN' | 'SHELL_COMMANDS' | 'XML' | 'JSON';

export interface NoteRecord {
  id: number;
  title: string;
  body: string;
  contentType: NoteContentType;
  taskId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}
