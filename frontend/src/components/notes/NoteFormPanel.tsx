import type { ReactNode } from "react";

interface NoteFormPanelProps {
  children: ReactNode;
}

export function NoteFormPanel({ children }: NoteFormPanelProps) {
  return <>{children}</>;
}
