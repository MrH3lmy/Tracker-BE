import type { ReactNode } from "react";
import { CodePreview } from "./CodePreview";
import { resolveNoteAccent } from "./noteAccent";
import type { NoteRecord } from "./noteTypes";
import { Badge, Card, cn } from "../ui";

interface NoteCardProps {
  note: NoteRecord;
  layout: "tile" | "row";
  eyebrow?: ReactNode;
  subtitle: ReactNode;
  actions: ReactNode;
  className?: string;
}

export function NoteCard({ note, layout, eyebrow, subtitle, actions, className }: NoteCardProps) {
  const accent = resolveNoteAccent(note, layout);
  const isTile = layout === "tile";

  return (
    <Card
      className={cn(
        "flex flex-col gap-2 transition-shadow duration-(--duration-fast) hover:shadow-(--shadow-glow-brand-lg)",
        isTile && "mb-4 break-inside-avoid",
        accent.borderClass,
        className,
      )}
      style={accent.style}
    >
      {eyebrow}
      <h3 className="text-sm font-semibold text-fg">{note.title}</h3>
      {subtitle}
      <CodePreview body={note.body} contentType={note.contentType} collapsedLineCount={isTile ? 8 : 4} initiallyCollapsed />
      {note.tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.map((tag) => <Badge key={tag} variant="neutral">{tag}</Badge>)}
        </div>
      ) : null}
      {note.attachments?.filter((attachment) => attachment.kind === "SCREENSHOT" && attachment.downloadUrl).map((attachment) => (
        <figure key={attachment.id} className="rounded-lg border border-line bg-inset/30 p-3">
          <img src={attachment.downloadUrl!} alt={attachment.caption ?? attachment.fileName} className="block max-w-full rounded-md" />
          <figcaption className="mt-2 text-xs text-fg-muted">
            {attachment.caption ?? attachment.fileName} · <a className="text-brand hover:underline" href={attachment.downloadUrl!} target="_blank" rel="noreferrer">Open/download attachment</a>
          </figcaption>
        </figure>
      ))}
      {actions}
    </Card>
  );
}
