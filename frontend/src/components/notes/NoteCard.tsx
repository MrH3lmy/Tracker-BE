import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CodePreview } from "./CodePreview";
import { NoteTypeBadge } from "./NoteTypeBadge";
import { resolveNoteAccent } from "./noteAccent";
import type { NoteBlockRecord, NoteRecord } from "./noteTypes";
import { Badge, Button, Card, cn } from "../ui";
import { Check } from "../ui/icons";

interface NoteCardProps {
  note: NoteRecord;
  layout: "tile" | "row";
  eyebrow?: ReactNode;
  subtitle: ReactNode;
  actions: ReactNode;
  className?: string;
  onConvertBlock?: (note: NoteRecord, block: NoteBlockRecord) => void;
  /** Resolved project name, shown as a chip (issue #296) - omit inside a project's own Notes tab where it'd be redundant. */
  projectName?: string;
}

/**
 * Persisted structured actions (issue #296) - distinct from the free-text draft block editor
 * inside the edit drawer. Only real `NoteBlock` rows (template-created or version-restored notes)
 * carry a stable id usable as `noteBlockId` for the idempotent convert-to-task contract.
 */
function StructuredActions({ note, onConvertBlock }: { note: NoteRecord; onConvertBlock?: (note: NoteRecord, block: NoteBlockRecord) => void }) {
  const actionBlocks = note.blocks?.filter((block) => block.type === "checklist" && (block.content ?? "").trim()) ?? [];
  if (actionBlocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-inset/30 p-3">
      <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">Action items</p>
      <ul className="flex flex-col gap-1">
        {actionBlocks.map((block) => {
          const link = note.taskLinks?.find((taskLink) => taskLink.blockId === block.id);
          return (
            <li key={block.id} className="flex min-h-11 items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-fg">{block.content}</span>
              {link ? (
                <Link to={`/tasks/${link.taskId}`}>
                  <Badge variant="positive">
                    <Check className="h-3 w-3" aria-hidden />
                    Task created
                  </Badge>
                </Link>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onConvertBlock?.(note, block)} disabled={!onConvertBlock}>
                  Convert to task
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function NoteCard({ note, layout, eyebrow, subtitle, actions, className, onConvertBlock, projectName }: NoteCardProps) {
  const accent = resolveNoteAccent(note, layout);
  const isTile = layout === "tile";
  const showTypeBadge = note.noteType && note.noteType !== "GENERAL";

  return (
    <Card
      className={cn(
        "flex min-w-0 flex-col gap-2 overflow-hidden transition-shadow duration-(--duration-fast) hover:shadow-(--shadow-glow-brand-lg)",
        isTile && "mb-4 break-inside-avoid",
        accent.borderClass,
        className,
      )}
      style={accent.style}
    >
      {eyebrow}
      <h3 className="text-sm font-semibold break-words text-fg">{note.title}</h3>
      {showTypeBadge || projectName ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {showTypeBadge ? <NoteTypeBadge noteType={note.noteType} /> : null}
          {projectName ? <Badge variant="outline">{projectName}</Badge> : null}
        </div>
      ) : null}
      {subtitle}
      <CodePreview body={note.body} contentType={note.contentType} collapsedLineCount={isTile ? 8 : 4} initiallyCollapsed />
      {note.tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.map((tag) => <Badge key={tag} variant="neutral">{tag}</Badge>)}
        </div>
      ) : null}
      <StructuredActions note={note} onConvertBlock={onConvertBlock} />
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
