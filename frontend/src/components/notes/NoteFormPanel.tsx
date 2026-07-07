import type { ReactNode } from "react";

interface NoteFormPanelProps {
  children: ReactNode;
  className?: string;
}

export function NoteFormPanel({ children, className }: NoteFormPanelProps) {
  return <div className={className}>{children}</div>;
}
