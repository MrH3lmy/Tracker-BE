import type { CSSProperties } from "react";
import type { NoteContentType, NoteRecord } from "./noteTypes";

const TILE_ACCENT_BY_CONTENT_TYPE: Record<NoteContentType, string> = {
  PLAIN_TEXT: "border-t-line-strong",
  MARKDOWN: "border-t-brand",
  SHELL_COMMANDS: "border-t-positive",
  XML: "border-t-caution",
  JSON: "border-t-critical",
};

const ROW_ACCENT_BY_CONTENT_TYPE: Record<NoteContentType, string> = {
  PLAIN_TEXT: "border-l-line-strong",
  MARKDOWN: "border-l-brand",
  SHELL_COMMANDS: "border-l-positive",
  XML: "border-l-caution",
  JSON: "border-l-critical",
};

export interface NoteAccent {
  borderClass: string;
  style?: CSSProperties;
}

export function resolveNoteAccent(note: Pick<NoteRecord, "color" | "contentType">, layout: "tile" | "row"): NoteAccent {
  if (note.color) {
    return layout === "tile"
      ? { borderClass: "border-t-2", style: { borderTopColor: note.color } }
      : { borderClass: "border-l-2", style: { borderLeftColor: note.color } };
  }

  const accentMap = layout === "tile" ? TILE_ACCENT_BY_CONTENT_TYPE : ROW_ACCENT_BY_CONTENT_TYPE;
  const colorClass = accentMap[note.contentType] ?? (layout === "tile" ? "border-t-line-strong" : "border-l-line-strong");
  return { borderClass: `${layout === "tile" ? "border-t-2" : "border-l-2"} ${colorClass}` };
}
