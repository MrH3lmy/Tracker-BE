import type { ClipboardEvent, Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { Link } from "react-router-dom";
import { QueryState } from "../QueryState";
import { NoteBlockEditor, blocksFromBody, bodyFromBlocks, type DraftNoteBlock } from "./NoteBlockEditor";
import type { NoteAiAction, NoteAiGenerationRecord, NoteContentType, NoteRecord, NoteTemplateRecord, NoteType } from "./noteTypes";
import { NOTE_TYPE_VALUES } from "./noteTypes";
import { NOTE_CONTENT_TYPES, formatDate, humanizeContentType, type NoteFormState } from "./notesPageHelpers";
import { formatEnumLabel } from "../../lib/enumLabels";
import type { TaskRecord } from "../tasks/taskTypes";
import type { ProjectRecord } from "../projects/projectTypes";
import { Badge, Button, Collapsible, Drawer, Field, Input, Select, Textarea } from "../ui";
import { X } from "../ui/icons";

interface TemplateVariableState {
  taskTitle: string;
  date: string;
  area: string;
  priority: string;
  dueDate: string;
}

interface MutationResultSummary {
  ok?: boolean;
}

interface CreateNoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editingNoteId: number | null;
  isBusy: boolean;
  canSubmit: boolean;
  noteFormTitleRef: RefObject<HTMLHeadingElement | null>;
  noteTitleInputRef: RefObject<HTMLInputElement | null>;
  canCreateFromTemplate: boolean;
  handleCreateFromTemplate: () => void;
  isCreateFromTemplatePending: boolean;
  templatesQueryIsLoading: boolean;
  templates: NoteTemplateRecord[];
  selectedTemplateId: string;
  setSelectedTemplateId: Dispatch<SetStateAction<string>>;
  templateVariableKeys: readonly (keyof TemplateVariableState)[];
  templateVariables: TemplateVariableState;
  setTemplateVariables: Dispatch<SetStateAction<TemplateVariableState>>;
  selectedTemplate: NoteTemplateRecord | null;
  renderedTemplatePreview: string;
  /** Opens the drawer straight onto the template picker (the header's "New from template"). */
  isTemplateSectionOpen: boolean;
  setIsTemplateSectionOpen: Dispatch<SetStateAction<boolean>>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  activeForm: NoteFormState;
  noteDate: string;
  setForm: Dispatch<SetStateAction<NoteFormState>>;
  availableTasks: TaskRecord[];
  collections: Array<{ id: number; name: string }>;
  projects: ProjectRecord[];
  draftBlocks: DraftNoteBlock[];
  setDraftBlocks: Dispatch<SetStateAction<DraftNoteBlock[]>>;
  handleTaskMentionShortcut: () => void;
  aiFeaturesEnabled: boolean;
  aiNoteActions: Array<{ action: NoteAiAction; label: string }>;
  runAiActionForNote: (action: NoteAiAction) => void;
  aiReviewSuggestion: NoteAiGenerationRecord | null;
  setAiReviewSuggestion: Dispatch<SetStateAction<NoteAiGenerationRecord | null>>;
  appendAiSuggestionToBody: () => void;
  aiGenerations: NoteAiGenerationRecord[];
  showRawBody: boolean;
  setShowRawBody: Dispatch<SetStateAction<boolean>>;
  noteBodyRef: RefObject<HTMLTextAreaElement | null>;
  handleBodyPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void | Promise<void>;
  notes: NoteRecord[];
  deleteTaskLink: { mutate: (args: { noteId: number; linkId: number }) => void };
  clipboardImageMessage: { kind: "error" | "success"; text: string } | null;
  pendingClipboardImages: Array<{ placeholder: string; caption: string; fileName: string }>;
  latestMutationResult: MutationResultSummary | null | undefined;
  onConvertToTask: (text: string) => void;
  onOpenVersionHistory: () => void;
  linkMentionedTask: (noteId: number, taskId: number, selectedText: string) => void;
}

/**
 * One create-and-edit surface, restructured writing-first (issue #299).
 *
 * Before: three tabs whose first panel opened with an eight-control metadata grid, then the
 * editor. Now the drawer is a single scroll in priority order -
 *
 *   Title -> body/blocks  (the writing surface)
 *   Organize              (project, type, collection, tags, task link - open, but below)
 *   Knowledge -> action   (task links, convert to task, AI actions)
 *   Advanced              (template, raw body, content type, date - collapsed)
 *
 * so nothing has to be filled in before you can start writing. Every field, id and capability
 * from the previous form is preserved; only their order and prominence changed.
 */
export function CreateNoteDrawer({
  isOpen, onClose, editingNoteId, isBusy, canSubmit, noteFormTitleRef, noteTitleInputRef, canCreateFromTemplate, handleCreateFromTemplate, isCreateFromTemplatePending, templatesQueryIsLoading, templates, selectedTemplateId, setSelectedTemplateId, templateVariableKeys, templateVariables, setTemplateVariables, selectedTemplate, renderedTemplatePreview, isTemplateSectionOpen, setIsTemplateSectionOpen, handleSubmit, activeForm, noteDate, setForm, availableTasks, collections, projects, draftBlocks, setDraftBlocks, handleTaskMentionShortcut, aiFeaturesEnabled, aiNoteActions, runAiActionForNote, aiReviewSuggestion, setAiReviewSuggestion, appendAiSuggestionToBody, aiGenerations, showRawBody, setShowRawBody, noteBodyRef, handleBodyPaste, notes, deleteTaskLink, clipboardImageMessage, pendingClipboardImages, latestMutationResult, onConvertToTask, onOpenVersionHistory, linkMentionedTask,
}: CreateNoteDrawerProps) {
  const editingNote = editingNoteId === null ? null : notes.find((note) => note.id === editingNoteId) ?? null;
  const isNew = editingNoteId === null;

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={<span ref={noteFormTitleRef} tabIndex={-1}>{isNew ? "New note" : "Edit note"}</span>}
      description={isNew ? "Give it a title and start writing — you can organize it afterwards." : `Editing note #${editingNoteId}`}
      wide
      footer={
        <>
          <div className="mr-auto min-w-0 self-center">
            {!canSubmit ? (
              <span className="text-xs text-fg-subtle">A title and some content are needed before saving.</span>
            ) : (
              <span className="text-xs text-fg-subtle">{isNew ? "Ready to save" : `Editing note #${editingNoteId}`}</span>
            )}
          </div>
          <Button onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button type="submit" form="note-form" variant="primary" disabled={!canSubmit}>
            {isBusy ? "Saving..." : "Save note"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <form id="note-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* ---------- 1. Writing surface ---------- */}
          <section className="flex flex-col gap-3" aria-label="Note content">
            <Field label="Title" htmlFor="noteTitle">
              <Input
                id="noteTitle"
                ref={noteTitleInputRef}
                value={activeForm.title}
                maxLength={255}
                placeholder="What is this note about?"
                className="h-11 text-base font-semibold"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </Field>

            <NoteBlockEditor
              blocks={draftBlocks}
              onChange={(blocks) => {
                setDraftBlocks(blocks);
                setForm((current) => ({ ...current, body: bodyFromBlocks(blocks) }));
              }}
              disabled={isBusy}
              onConvertToTask={(block) => onConvertToTask(block.content ?? "")}
            />

            {clipboardImageMessage ? (
              <p
                className={clipboardImageMessage.kind === "error" ? "text-sm text-critical" : "text-sm text-fg-muted"}
                role={clipboardImageMessage.kind === "error" ? "alert" : "status"}
              >
                {clipboardImageMessage.text}
              </p>
            ) : null}
            {pendingClipboardImages.length > 0 ? (
              <div className="rounded-lg border border-line bg-inset/40 p-3 text-sm text-fg-muted" role="status">
                <strong className="text-fg">Pasted screenshots waiting to upload</strong>
                <ul className="mt-1 list-disc pl-5">
                  {pendingClipboardImages.map((image, index) => (
                    <li key={`${image.fileName}-${image.caption}-${index}`}>
                      {image.placeholder} — {image.fileName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* ---------- 2. Organize ---------- */}
          <Collapsible title="Organize" defaultOpen>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Project (optional)" htmlFor="noteProjectId">
                <Select id="noteProjectId" value={activeForm.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}>
                  <option value="">No project</option>
                  {projects.map((project) => <option key={project.id} value={String(project.id)}>{project.name}</option>)}
                </Select>
              </Field>
              <Field label="Note type" htmlFor="noteType" hint="Drives the smart views and type lenses in the library.">
                <Select id="noteType" value={activeForm.noteType} onChange={(event) => setForm((current) => ({ ...current, noteType: event.target.value as NoteType }))}>
                  {NOTE_TYPE_VALUES.map((type) => <option key={type} value={type}>{formatEnumLabel(type)}</option>)}
                </Select>
              </Field>
              <Field label="Collection" htmlFor="noteCollectionId">
                <Select id="noteCollectionId" value={activeForm.collectionId} onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}>
                  <option value="">No collection</option>
                  {collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}
                </Select>
              </Field>
              <Field label="Linked task (optional)" htmlFor="noteTaskId">
                <Select id="noteTaskId" value={activeForm.taskId} onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))}>
                  <option value="">No linked task</option>
                  {availableTasks.map((task) => <option key={task.id} value={String(task.id)}>{task.title}</option>)}
                </Select>
              </Field>
              <Field label="Tags" htmlFor="noteTags" className="sm:col-span-2" hint="Comma separated. Tag a note “archived” to move it out of your working set.">
                <Input
                  id="noteTags"
                  value={activeForm.tags}
                  placeholder="backend, adr, paci"
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                />
              </Field>
            </div>
          </Collapsible>

          {/* ---------- 3. Knowledge -> action ---------- */}
          <Collapsible title="Knowledge → action" badge={aiReviewSuggestion ? <Badge variant="brand" aria-label="AI suggestion awaiting review">1</Badge> : null}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-medium text-fg">Turn this note into work</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isNew || !activeForm.body.trim()}
                    onClick={() => {
                      const textarea = noteBodyRef.current;
                      const selected = textarea && textarea.selectionStart !== textarea.selectionEnd
                        ? activeForm.body.slice(textarea.selectionStart, textarea.selectionEnd)
                        : activeForm.body;
                      onConvertToTask(selected);
                    }}
                  >
                    Convert selected text to task
                  </Button>
                  <Button type="button" size="sm" disabled={isNew || availableTasks.length === 0 || isBusy} onClick={handleTaskMentionShortcut}>
                    Link @task mention
                  </Button>
                  {!isNew ? (
                    <Button type="button" size="sm" onClick={onOpenVersionHistory}>Version history</Button>
                  ) : null}
                </div>
                <p className="text-xs text-fg-subtle">
                  {isNew
                    ? "Save the note first — conversion and task links need a stored note."
                    : "Free-text conversion always creates a new task. Structured action items convert once each, from the note card in the library."}
                </p>
              </div>

              {!isNew && editingNote?.taskLinks?.length ? (
                <div className="flex flex-wrap gap-1.5" aria-label="Linked task chips">
                  {editingNote.taskLinks.map((link) => (
                    <Badge key={link.id} variant="neutral" className="gap-1.5 py-1">
                      <Link to={`/tasks?focusTaskId=${encodeURIComponent(String(link.taskId))}`} className="min-w-0 truncate hover:underline">
                        #{link.taskId} {link.taskTitle ?? "Task"}
                      </Link>
                      <button
                        type="button"
                        className="shrink-0 text-fg-subtle hover:text-critical"
                        onClick={() => deleteTaskLink.mutate({ noteId: editingNoteId, linkId: link.id })}
                        disabled={isBusy}
                        aria-label={`Unlink task #${link.taskId}`}
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-fg">AI actions</p>
                  <Badge variant={aiFeaturesEnabled ? "positive" : "neutral"}>{aiFeaturesEnabled ? "Enabled" : "Disabled in settings"}</Badge>
                </div>
                <p className="text-xs text-fg-subtle">
                  Local rule-based heuristics (sentence splitting and keyword matching) — not a hosted LLM. Suggestions are stored with audit metadata; tasks are never created automatically.
                </p>
                <div className="flex flex-wrap gap-1.5" role="menu" aria-label="AI actions menu">
                  {aiNoteActions.map((item) => (
                    <Button
                      key={item.action}
                      type="button"
                      size="sm"
                      role="menuitem"
                      disabled={!aiFeaturesEnabled || isNew || !activeForm.body.trim() || isBusy}
                      onClick={() => runAiActionForNote(item.action)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                {aiReviewSuggestion ? (
                  <div className="mt-1 rounded-lg border border-line bg-inset/40 p-3" role="status" aria-live="polite">
                    <p className="text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">
                      Review before applying · {aiReviewSuggestion.provider} {aiReviewSuggestion.model ? `(${aiReviewSuggestion.model})` : ""}
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-md bg-inset p-2 font-mono text-xs whitespace-pre-wrap text-fg">{aiReviewSuggestion.generatedContent}</pre>
                    <p className="mt-2 text-sm text-fg-muted">
                      Audit: generated={String(aiReviewSuggestion.generated)} · action={aiReviewSuggestion.action} · source hash {aiReviewSuggestion.sourceHash.slice(0, 12)}…
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="primary" onClick={appendAiSuggestionToBody}>Append to note body</Button>
                      <Button size="sm" onClick={() => setAiReviewSuggestion(null)}>Dismiss</Button>
                      {(aiReviewSuggestion.action === 'EXTRACT_TASKS' || aiReviewSuggestion.action === 'CREATE_TASK_PLAN') ? (
                        <span className="text-sm text-fg-muted">Confirm tasks manually with the conversion flow above.</span>
                      ) : null}
                    </div>
                  </div>
                ) : aiGenerations.length > 0 ? (
                  <p className="text-sm text-fg-muted">
                    Latest stored AI suggestion: {aiGenerations[0].action.toLowerCase().replaceAll('_', ' ')} generated {formatDate(aiGenerations[0].createdAt)}.
                  </p>
                ) : null}
              </div>
            </div>
          </Collapsible>

          {/* ---------- 4. Advanced ---------- */}
          <Collapsible title="Templates and advanced" open={isTemplateSectionOpen} onOpenChange={setIsTemplateSectionOpen}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-fg">Start from a template</p>
                    <p className="text-xs text-fg-subtle">Pick a template, fill its variables, and create the note with structured blocks already in place.</p>
                  </div>
                  <Button variant="primary" size="sm" disabled={!canCreateFromTemplate} onClick={handleCreateFromTemplate}>
                    {isCreateFromTemplatePending ? "Creating..." : "Create from template"}
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Template" htmlFor="noteTemplateSelect" className="min-w-48 flex-1">
                    <Select id="noteTemplateSelect" value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} disabled={templatesQueryIsLoading}>
                      <option value="">Select a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={String(template.id)}>{template.category ? `${template.category} · ` : ""}{template.name}</option>
                      ))}
                    </Select>
                  </Field>
                  {templateVariableKeys.map((key) => (
                    <Field key={key} label={key.replace(/([A-Z])/g, " $1")} htmlFor={`noteTemplateVar-${key}`} className="min-w-32 flex-1">
                      <Input
                        id={`noteTemplateVar-${key}`}
                        type={key.toLowerCase().includes("date") ? "date" : "text"}
                        value={templateVariables[key]}
                        onChange={(event) => setTemplateVariables((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </Field>
                  ))}
                </div>
                {selectedTemplate ? (
                  <div className="rounded-lg border border-line bg-inset/40 p-3">
                    <strong className="text-sm text-fg">{selectedTemplate.name}</strong>
                    <p className="mt-0.5 text-sm text-fg-muted">{selectedTemplate.description}</p>
                    <pre className="mt-2 overflow-x-auto rounded-md bg-inset p-2 font-mono text-xs whitespace-pre-wrap text-fg">{renderedTemplatePreview}</pre>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
                <Field label="Content type" htmlFor="noteContentType" hint="Code types render with syntax highlighting in the library.">
                  <Select
                    id="noteContentType"
                    value={activeForm.contentType}
                    onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value as NoteContentType }))}
                  >
                    {NOTE_CONTENT_TYPES.map((type) => <option key={type} value={type}>{humanizeContentType(type)}</option>)}
                  </Select>
                </Field>
                <Field label="Date" htmlFor="noteDate">
                  <Input id="noteDate" type="date" value={noteDate} readOnly />
                </Field>
              </div>

              <Collapsible title="Raw note body" open={showRawBody} onOpenChange={setShowRawBody}>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-fg-muted">The API payload body — for paste uploads, migrations, or raw edits. Pasting an image here uploads it as a screenshot attachment.</p>
                  <Field label="Raw note body" htmlFor="noteBody">
                    <Textarea
                      id="noteBody"
                      className="font-mono text-xs"
                      rows={8}
                      value={activeForm.body}
                      ref={noteBodyRef}
                      onPaste={(event) => void handleBodyPaste(event)}
                      onChange={(event) => {
                        const nextBody = event.target.value;
                        setForm((current) => ({ ...current, body: nextBody }));
                        setDraftBlocks(blocksFromBody(nextBody));
                        if (!isNew && /(^|\s)(@task|\/task)\b/i.test(nextBody)) {
                          const selectedTask = availableTasks.find((task) => String(task.id) === activeForm.taskId);
                          if (selectedTask && !notes.find((note) => note.id === editingNoteId)?.taskLinks?.some((link) => link.taskId === selectedTask.id)) {
                            linkMentionedTask(editingNoteId, selectedTask.id, selectedTask.title);
                          }
                        }
                      }}
                      required
                    />
                  </Field>
                </div>
              </Collapsible>
            </div>
          </Collapsible>
        </form>

        <QueryState
          isLoading={false}
          isError={Boolean(latestMutationResult && !latestMutationResult.ok)}
          isEmpty={false}
          successMessage={latestMutationResult?.ok ? "Note saved." : undefined}
        />
      </div>
    </Drawer>
  );
}
