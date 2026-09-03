import { memo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CodePreview } from "./CodePreview";
import { NOTE_TYPE_ICON } from "./noteTypeIcons";
import { resolveNoteAccent } from "./noteAccent";
import { formatRelativeTime, humanizeContentType } from "./notesPageHelpers";
import type { NoteAttachmentRecord, NoteBlockRecord, NoteRecord } from "./noteTypes";
import { formatEnumLabel } from "../../lib/enumLabels";
import { Badge, Button, Card, cn } from "../ui";
import { Camera, Check, Link2, ListChecks } from "../ui/icons";

interface NoteCardProps {
  note: NoteRecord;
  layout: "tile" | "row";
  eyebrow?: ReactNode;
  /** Extra context line rendered under the standard meta line (sticky order, timeline dates...). */
  subtitle?: ReactNode;
  actions: ReactNode;
  className?: string;
  onConvertBlock?: (note: NoteRecord, block: NoteBlockRecord) => void;
  /** Resolved project name, shown in the meta line - omit inside a project's own Notes tab. */
  projectName?: string;
  /** Resolved linked-task title, shown as an action signal when the note points at a task. */
  linkedTaskTitle?: string;
  /** Opens the note as a page. When omitted (project tabs) the title renders as plain text. */
  onOpen?: () => void;
}

/** Code content types keep the terminal chrome; prose types get a plain clamped excerpt. */
const CODE_CONTENT_TYPES = new Set(["SHELL_COMMANDS", "XML", "JSON"]);
const MAX_VISIBLE_TAGS = 4;
const MAX_VISIBLE_ACTIONS = 3;
const MAX_VISIBLE_THUMBNAILS = 3;

function excerptFromBody(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*[#>*-]+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Persisted structured actions (issue #296) - distinct from the free-text draft block editor
 * inside the edit drawer. Only real `NoteBlock` rows (template-created or version-restored notes)
 * carry a stable id usable as `noteBlockId` for the idempotent convert-to-task contract.
 *
 * Issue #299 caps the visible rows so a note with ten action items no longer turns its card into
 * a wall; the rest stay one click away rather than being hidden.
 */
function StructuredActions({
  note,
  onConvertBlock,
}: {
  note: NoteRecord;
  onConvertBlock?: (note: NoteRecord, block: NoteBlockRecord) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const actionBlocks = note.blocks?.filter((block) => block.type === "checklist" && (block.content ?? "").trim()) ?? [];
  if (actionBlocks.length === 0) return null;

  const linkForBlock = (blockId: number) => note.taskLinks?.find((taskLink) => taskLink.blockId === blockId);
  const visible = showAll ? actionBlocks : actionBlocks.slice(0, MAX_VISIBLE_ACTIONS);

  return (
    <ul className="flex flex-col gap-0.5" aria-label={`Action items in ${note.title}`}>
      {visible.map((block) => {
        const link = linkForBlock(block.id);
        return (
          <li key={block.id} className="flex min-h-9 items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-xs border",
                  link ? "border-positive bg-positive-soft text-positive" : "border-line-strong",
                )}
              >
                {link ? <Check className="h-3 w-3" aria-hidden /> : null}
              </span>
              <span className="min-w-0 truncate text-fg">{block.content}</span>
            </span>
            {link ? (
              <Link to={`/tasks/${link.taskId}`} className="shrink-0">
                <Badge variant="positive">
                  <Check className="h-3 w-3" aria-hidden />
                  Task created
                </Badge>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => onConvertBlock?.(note, block)}
                disabled={!onConvertBlock}
              >
                Convert to task
              </Button>
            )}
          </li>
        );
      })}
      {actionBlocks.length > MAX_VISIBLE_ACTIONS ? (
        <li>
          <Button size="sm" variant="ghost" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Show fewer action items" : `Show all ${actionBlocks.length} action items`}
          </Button>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Screenshots as a thumbnail strip rather than full-bleed images inside every result
 * (issue #299). Each thumbnail keeps its link to the full attachment, so nothing is lost -
 * `loading="lazy"` and a fixed box stop a screenshot-heavy library from blowing up the scroll.
 */
function ScreenshotStrip({ attachments, noteTitle }: { attachments: NoteAttachmentRecord[]; noteTitle: string }) {
  const [showAll, setShowAll] = useState(false);
  if (attachments.length === 0) return null;
  const visible = showAll ? attachments : attachments.slice(0, MAX_VISIBLE_THUMBNAILS);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`Screenshots attached to ${noteTitle}`}>
      {visible.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.downloadUrl!}
          target="_blank"
          rel="noreferrer"
          className="group block shrink-0 overflow-hidden rounded-md border border-line focus-visible:border-brand"
          title={attachment.caption ?? attachment.fileName}
        >
          <img
            src={attachment.downloadUrl!}
            alt={attachment.caption ?? `Screenshot ${attachment.fileName} attached to ${noteTitle}`}
            loading="lazy"
            className="block h-16 w-24 max-w-full bg-inset object-cover"
          />
        </a>
      ))}
      {attachments.length > MAX_VISIBLE_THUMBNAILS ? (
        <Button size="sm" variant="ghost" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Show fewer screenshots" : `+${attachments.length - MAX_VISIBLE_THUMBNAILS} more`}
        </Button>
      ) : null}
    </div>
  );
}

function TagList({ tags, noteTitle }: { tags: string[]; noteTitle: string }) {
  const [showAll, setShowAll] = useState(false);
  if (tags.length === 0) return null;
  const visible = showAll ? tags : tags.slice(0, MAX_VISIBLE_TAGS);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" aria-label={`Tags on ${noteTitle}`}>
      {visible.map((tag) => (
        <Badge key={tag} variant="neutral" className="min-w-0">
          <span className="min-w-0 truncate">{tag}</span>
        </Badge>
      ))}
      {tags.length > MAX_VISIBLE_TAGS ? (
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setShowAll((current) => !current)}>
          {showAll ? "Show fewer tags" : `+${tags.length - MAX_VISIBLE_TAGS}`}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * A note result, ranked (issue #299): identity, then context, then content, then actionable
 * signals, then metadata, then controls. Everything the old card showed is still reachable; what
 * changed is that only the first three levels are rendered at full weight by default.
 */
function NoteCardComponent({
  note,
  layout,
  eyebrow,
  subtitle,
  actions,
  className,
  onConvertBlock,
  projectName,
  linkedTaskTitle,
  onOpen,
}: NoteCardProps) {
  const accent = resolveNoteAccent(note, layout);
  const isTile = layout === "tile";
  const TypeIcon = NOTE_TYPE_ICON[note.noteType ?? "GENERAL"];
  const isCodeNote = CODE_CONTENT_TYPES.has(note.contentType);
  const excerpt = isCodeNote ? "" : excerptFromBody(note.body ?? "");
  const screenshots = note.attachments?.filter((attachment) => attachment.kind === "SCREENSHOT" && attachment.downloadUrl) ?? [];
  const actionBlocks = note.blocks?.filter((block) => block.type === "checklist" && (block.content ?? "").trim()) ?? [];
  const convertedActions = actionBlocks.filter((block) => note.taskLinks?.some((link) => link.blockId === block.id)).length;
  const openActions = actionBlocks.length - convertedActions;
  const hasSignals = actionBlocks.length > 0 || screenshots.length > 0 || Boolean(linkedTaskTitle);

  return (
    <Card
      className={cn(
        "flex min-w-0 flex-col gap-2 overflow-hidden p-4 transition-colors duration-(--duration-fast) hover:border-line-strong",
        isTile && "mb-4 break-inside-avoid",
        accent.borderClass,
        className,
      )}
      style={accent.style}
    >
      {eyebrow}

      {/* 1. Identity - never single-line truncated: the title is what the note *is*, and it is
          the primary way into the note's page. */}
      <h4 className="text-[15px] leading-snug font-semibold break-words text-fg">
        {onOpen ? (
          <button type="button" onClick={onOpen} className="text-left hover:text-brand hover:underline">
            {note.title}
          </button>
        ) : (
          note.title
        )}
      </h4>

      {/* 2. Context: type, project, freshness - text and icon, not a wall of coloured badges. */}
      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-muted">
        <TypeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-medium text-fg-muted">{formatEnumLabel(note.noteType ?? "GENERAL")}</span>
        {projectName ? (
          <>
            <span aria-hidden>·</span>
            <span className="min-w-0 max-w-56 truncate" title={projectName}>{projectName}</span>
          </>
        ) : null}
        {note.collectionName ? (
          <>
            <span aria-hidden>·</span>
            <span className="min-w-0 max-w-40 truncate" title={note.collectionName}>{note.collectionName}</span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <span className="whitespace-nowrap">
          <span className="sr-only">Last updated </span>
          {formatRelativeTime(note.updatedAt)}
        </span>
        {isCodeNote ? (
          <>
            <span aria-hidden>·</span>
            <span className="whitespace-nowrap">{humanizeContentType(note.contentType)}</span>
          </>
        ) : null}
      </p>

      {subtitle}

      {/* 3. Content preview. */}
      {isCodeNote ? (
        <CodePreview body={note.body} contentType={note.contentType} collapsedLineCount={isTile ? 8 : 4} initiallyCollapsed />
      ) : excerpt ? (
        <p className={cn("text-sm leading-relaxed break-words text-fg-muted", isTile ? "line-clamp-4" : "line-clamp-2")}>
          {excerpt}
        </p>
      ) : null}

      {/* 4. Actionable signals - rendered only when the note actually has any. */}
      {hasSignals ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
          {actionBlocks.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 shrink-0 text-caution" aria-hidden />
              {openActions > 0
                ? `${openActions} open action item${openActions === 1 ? "" : "s"}`
                : `${actionBlocks.length} action item${actionBlocks.length === 1 ? "" : "s"}`}
              {convertedActions > 0 ? <span className="text-fg-subtle">· {convertedActions} converted</span> : null}
            </span>
          ) : null}
          {screenshots.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {screenshots.length} screenshot{screenshots.length === 1 ? "" : "s"}
            </span>
          ) : null}
          {linkedTaskTitle ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 max-w-56 truncate" title={linkedTaskTitle}>{linkedTaskTitle}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      <StructuredActions note={note} onConvertBlock={onConvertBlock} />
      <ScreenshotStrip attachments={screenshots} noteTitle={note.title} />

      {/* 5. Metadata. */}
      <TagList tags={note.tags ?? []} noteTitle={note.title} />

      {/* 6. Controls - always rendered, never hover-revealed. */}
      {actions}
    </Card>
  );
}

export const NoteCard = memo(NoteCardComponent);
