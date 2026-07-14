import type { NoteContentType, NoteRecord } from "./noteTypes";

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
  tags: string;
  body: string;
}

export const EMPTY_FORM: NoteFormState = {
  title: "",
  contentType: "PLAIN_TEXT",
  taskId: "",
  collectionId: "",
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
    tags: note.tags?.join(", ") ?? "",
    body: note.body,
  };
}

export function buildNotePayload(form: NoteFormState) {
  const trimmedTaskId = form.taskId.trim();
  const trimmedCollectionId = form.collectionId.trim();
  return {
    title: form.title.trim(),
    contentType: form.contentType,
    taskId: trimmedTaskId ? Number(trimmedTaskId) : null,
    collectionId: trimmedCollectionId ? Number(trimmedCollectionId) : null,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    body: form.body,
  };
}
