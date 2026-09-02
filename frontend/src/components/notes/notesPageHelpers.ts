import type { NoteContentType, NoteRecord, NoteType } from "./noteTypes";

export const NOTE_CONTENT_TYPES: NoteContentType[] = [
  "PLAIN_TEXT",
  "MARKDOWN",
  "SHELL_COMMANDS",
  "XML",
  "JSON",
];

export type NotesViewMode = 'sticky' | 'list' | 'table' | 'timeline';
export type NoteSortBy = 'createdAt' | 'updatedAt' | 'displayOrder' | 'title' | 'task' | 'contentType';

export interface NoteFormState {
  title: string;
  contentType: NoteContentType;
  taskId: string;
  collectionId: string;
  projectId: string;
  noteType: NoteType;
  tags: string;
  body: string;
}

export const EMPTY_FORM: NoteFormState = {
  title: "",
  contentType: "PLAIN_TEXT",
  taskId: "",
  collectionId: "",
  projectId: "",
  noteType: "GENERAL",
  tags: "",
  body: "",
};

export interface CropPoint {
  x: number;
  y: number;
}

export interface CropSelection {
  start: CropPoint;
  end: CropPoint;
}

export interface CropOverlayState {
  fileName: string;
  imageSrc: string;
  width: number;
  height: number;
  selection: CropSelection | null;
  isDragging: boolean;
  resolve: (value: { file: File; width: number; height: number }) => void;
  reject: (reason?: unknown) => void;
}

export const SCREENSHOT_MAX_FILE_SIZE_BYTES = 5_242_880;
export const SUPPORTED_SCREENSHOT_TYPES = "PNG, JPEG, or WebP";

export function humanizeContentType(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDate(value?: string): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function formatBytes(value: number): string {
  return `${value.toLocaleString()} bytes (${(value / 1024 / 1024).toFixed(1)} MiB)`;
}

export function getStickyNoteNumber(note: NoteRecord): number {
  return note.displayOrder ?? 0;
}

export function noteToForm(note: NoteRecord): NoteFormState {
  return {
    title: note.title,
    contentType: note.contentType,
    taskId: note.taskId == null ? "" : String(note.taskId),
    collectionId: note.collectionId == null ? "" : String(note.collectionId),
    projectId: note.projectId == null ? "" : String(note.projectId),
    noteType: note.noteType ?? "GENERAL",
    tags: note.tags?.join(", ") ?? "",
    body: note.body,
  };
}

export function buildNotePayload(form: NoteFormState) {
  const trimmedTaskId = form.taskId.trim();
  const trimmedCollectionId = form.collectionId.trim();
  const trimmedProjectId = form.projectId.trim();
  return {
    title: form.title.trim(),
    contentType: form.contentType,
    taskId: trimmedTaskId ? Number(trimmedTaskId) : null,
    collectionId: trimmedCollectionId ? Number(trimmedCollectionId) : null,
    projectId: trimmedProjectId ? Number(trimmedProjectId) : null,
    noteType: form.noteType,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    body: form.body,
  };
}

/** Sort options offered by the Notes workspace result toolbar (issue #299). */
export const NOTE_SORT_OPTIONS: Array<{ value: NoteSortBy; label: string }> = [
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'createdAt', label: 'Recently created' },
  { value: 'title', label: 'Title' },
  { value: 'displayOrder', label: 'Sticky order' },
  { value: 'task', label: 'Task' },
  { value: 'contentType', label: 'Content type' },
];

/**
 * Short relative time for note meta lines ("40m ago"). Falls back to the absolute
 * string `formatDate` produces for anything unparseable or older than a week, so a
 * scanning user never sees "63 days ago" where a date is more useful.
 */
export function formatRelativeTime(value?: string): string {
  if (!value) return 'Not available';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return value;
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
