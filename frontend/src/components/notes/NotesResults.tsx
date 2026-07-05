import type { ReactNode } from "react";
import type { NotesViewMode } from "./notesPageHelpers";

interface NotesResultsProps {
  viewMode: NotesViewMode;
  children: ReactNode;
}

export function NotesResults({ viewMode, children }: NotesResultsProps) {
  return (
    <div data-notes-view-mode={viewMode}>
      {children}
    </div>
  );
}
