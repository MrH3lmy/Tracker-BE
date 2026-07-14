import type { ClipboardEvent, Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { Link } from "react-router-dom";
import { QueryState } from "../QueryState";
import { NoteBlockEditor, blocksFromBody, bodyFromBlocks, type DraftNoteBlock } from "./NoteBlockEditor";
import type { NoteAiAction, NoteAiGenerationRecord, NoteContentType, NoteRecord, NoteTemplateRecord } from "./noteTypes";
import { NOTE_CONTENT_TYPES, formatDate, humanizeContentType, type NoteFormState } from "./notesPageHelpers";
import type { TaskRecord } from "../tasks/taskTypes";
import { Badge, Button, Card, CardHeader, Collapsible, Drawer, Field, Input, Select, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from "../ui";

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
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  activeForm: NoteFormState;
  noteDate: string;
  setForm: Dispatch<SetStateAction<NoteFormState>>;
  availableTasks: TaskRecord[];
  collections: Array<{ id: number; name: string }>;
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
  linkMentionedTask: (noteId: number, taskId: number, selectedText: string) => void;
}

export function CreateNoteDrawer({
  isOpen, onClose, editingNoteId, isBusy, canSubmit, noteFormTitleRef, noteTitleInputRef, canCreateFromTemplate, handleCreateFromTemplate, isCreateFromTemplatePending, templatesQueryIsLoading, templates, selectedTemplateId, setSelectedTemplateId, templateVariableKeys, templateVariables, setTemplateVariables, selectedTemplate, renderedTemplatePreview, handleSubmit, activeForm, noteDate, setForm, availableTasks, collections, draftBlocks, setDraftBlocks, handleTaskMentionShortcut, aiFeaturesEnabled, aiNoteActions, runAiActionForNote, aiReviewSuggestion, setAiReviewSuggestion, appendAiSuggestionToBody, aiGenerations, showRawBody, setShowRawBody, noteBodyRef, handleBodyPaste, notes, deleteTaskLink, clipboardImageMessage, pendingClipboardImages, latestMutationResult, onConvertToTask, linkMentionedTask,
}: CreateNoteDrawerProps) {
  const editingNote = editingNoteId === null ? null : notes.find((note) => note.id === editingNoteId) ?? null;

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={<span ref={noteFormTitleRef} tabIndex={-1}>{editingNoteId === null ? "Create note" : "Edit note"}</span>}
      description="Notes require a title, content type, and body. Task IDs link notes to tasks while keeping task descriptions separate."
      wide
      footer={
        <>
          <div className="mr-auto min-w-0 self-center">
            <strong className="block text-sm text-fg">{editingNoteId === null ? "Ready to create" : `Editing note #${editingNoteId}`}</strong>
            {!canSubmit ? <span className="text-xs text-fg-subtle">Title and body are required before saving.</span> : null}
          </div>
          <Button onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button type="submit" form="note-form" variant="primary" disabled={!canSubmit}>
            {isBusy ? "Saving..." : "Save note"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <form id="note-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5">
                AI actions
                {aiReviewSuggestion ? <Badge variant="brand" aria-label="AI suggestion awaiting review">1</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Title" htmlFor="noteTitle" className="sm:col-span-2">
                  <Input
                    id="noteTitle"
                    ref={noteTitleInputRef}
                    value={activeForm.title}
                    maxLength={255}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    required
                  />
                </Field>
                <Field label="Content type" htmlFor="noteContentType">
                  <Select
                    id="noteContentType"
                    value={activeForm.contentType}
                    onChange={(event) => setForm((current) => ({ ...current, contentType: event.target.value as NoteContentType }))}
                  >
                    {NOTE_CONTENT_TYPES.map((type) => (
                      <option key={type} value={type}>{humanizeContentType(type)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Linked task (optional)" htmlFor="noteTaskId">
                  <Select
                    id="noteTaskId"
                    value={activeForm.taskId}
                    onChange={(event) => setForm((current) => ({ ...current, taskId: event.target.value }))}
                  >
                    <option value="">No linked task</option>
                    {availableTasks.map((task) => (
                      <option key={task.id} value={String(task.id)}>{task.title}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Collection" htmlFor="noteCollectionId">
                  <Select id="noteCollectionId" value={activeForm.collectionId} onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}>
                    <option value="">No collection</option>
                    {collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}
                  </Select>
                </Field>
                <Field label="Date" htmlFor="noteDate">
                  <Input id="noteDate" type="date" value={noteDate} readOnly />
                </Field>
                <Field label="Tags" htmlFor="noteTags" className="sm:col-span-2">
                  <Input
                    id="noteTags"
                    value={activeForm.tags}
                    placeholder="Comma-separated tags"
                    onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  />
                </Field>
              </div>

              <NoteBlockEditor
                blocks={draftBlocks}
                onChange={(blocks) => {
                  setDraftBlocks(blocks);
                  setForm((current) => ({ ...current, body: bodyFromBlocks(blocks) }));
                }}
                disabled={isBusy}
                onConvertToTask={(block) => onConvertToTask(block.content ?? "")}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" disabled={editingNoteId === null || availableTasks.length === 0 || isBusy} onClick={handleTaskMentionShortcut}>
                  Link @task mention
                </Button>
                <span className="text-sm text-fg-muted">Type @task or /task in the note, select text, then link it to the current or first loaded task.</span>
              </div>

              {editingNoteId !== null && editingNote?.taskLinks?.length ? (
                <div className="flex flex-wrap gap-1.5" aria-label="Linked task chips">
                  {editingNote.taskLinks.map((link) => (
                    <Badge key={link.id} variant="neutral" className="gap-1.5 py-1">
                      <Link to={`/tasks?focusTaskId=${encodeURIComponent(String(link.taskId))}`} className="hover:underline">#{link.taskId} {link.taskTitle ?? "Task"}</Link>
                      <button type="button" className="text-fg-subtle hover:text-critical" onClick={() => deleteTaskLink.mutate({ noteId: editingNoteId, linkId: link.id })} disabled={isBusy} aria-label={`Unlink task #${link.taskId}`}>×</button>
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={editingNoteId === null || !activeForm.body.trim()}
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
                {editingNoteId === null ? <span className="text-sm text-fg-muted">Save the note before converting selected text.</span> : null}
              </div>

              {clipboardImageMessage ? (
                <p
                  className={clipboardImageMessage.kind === "error" ? "text-sm text-critical" : "text-sm text-fg-muted"}
                  role={clipboardImageMessage.kind === "error" ? "alert" : "status"}
                >
                  {clipboardImageMessage.text}
                </p>
              ) : null}
              {pendingClipboardImages.length > 0 ? (
                <div className="text-sm text-fg-muted" role="status">
                  <strong className="text-fg">Pending pasted screenshots</strong>
                  <ul className="mt-1 list-disc pl-5">
                    {pendingClipboardImages.map((image, index) => (
                      <li key={`${image.fileName}-${image.caption}-${index}`}>
                        {image.placeholder} — {image.fileName}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="ai" className="flex flex-col gap-4 pt-4">
              <Card aria-label="AI actions review">
                <CardHeader
                  title="AI actions"
                  description="Generate summaries, task candidates, decisions, rewrites, or task plans for review. Suggestions are stored separately with audit metadata and tasks are never auto-created."
                  actions={<Badge variant={aiFeaturesEnabled ? "positive" : "neutral"}>{aiFeaturesEnabled ? "Enabled" : "Disabled in settings"}</Badge>}
                />
                <p className="-mt-2 mb-3 text-xs text-fg-subtle">
                  These run entirely locally as rule-based text heuristics (sentence splitting and keyword matching) — not a hosted LLM or any external AI service.
                </p>
                <div className="flex flex-wrap gap-1.5" role="menu" aria-label="AI actions menu">
                  {aiNoteActions.map((item) => (
                    <Button
                      key={item.action}
                      type="button"
                      size="sm"
                      role="menuitem"
                      disabled={!aiFeaturesEnabled || editingNoteId === null || !activeForm.body.trim() || isBusy}
                      onClick={() => runAiActionForNote(item.action)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                {!aiFeaturesEnabled ? (
                  <p className="mt-2 text-xs text-fg-subtle">
                    Turn on <code>aiFeaturesEnabled</code> in Settings only when AI assistance is acceptable for your offline/privacy posture.
                  </p>
                ) : null}
                {aiReviewSuggestion ? (
                  <div className="mt-3 rounded-lg border border-line bg-inset/30 p-3" role="status" aria-live="polite">
                    <p className="text-xs font-semibold tracking-wide text-fg-subtle uppercase">
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
                        <span className="text-sm text-fg-muted">Confirm tasks manually with the existing conversion flow.</span>
                      ) : null}
                    </div>
                  </div>
                ) : aiGenerations.length > 0 ? (
                  <p className="mt-2 text-sm text-fg-muted">
                    Latest stored AI suggestion: {aiGenerations[0].action.toLowerCase().replaceAll('_', ' ')} generated {formatDate(aiGenerations[0].createdAt)}.
                  </p>
                ) : null}
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="flex flex-col gap-4 pt-4">
              <Card aria-label="New from template">
                <CardHeader
                  title="New from template"
                  description="Pick a default template, preview the rendered note, and fill variables like task title, date, area, priority, and due date."
                  actions={
                    <Button variant="primary" size="sm" disabled={!canCreateFromTemplate} onClick={handleCreateFromTemplate}>
                      {isCreateFromTemplatePending ? "Creating..." : "Create from template"}
                    </Button>
                  }
                />
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
                  <div className="mt-3 rounded-lg border border-line bg-inset/30 p-3">
                    <strong className="text-sm text-fg">{selectedTemplate.name}</strong>
                    <p className="mt-0.5 text-sm text-fg-muted">{selectedTemplate.description}</p>
                    <pre className="mt-2 overflow-x-auto rounded-md bg-inset p-2 font-mono text-xs whitespace-pre-wrap text-fg">{renderedTemplatePreview}</pre>
                  </div>
                ) : null}
              </Card>

              <Collapsible title="Raw note body" open={showRawBody} onOpenChange={setShowRawBody}>
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-fg-muted">Reveal the API payload body for paste uploads, migrations, or raw edits.</p>
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
                        if (editingNoteId !== null && /(^|\s)(@task|\/task)\b/i.test(nextBody)) {
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
            </TabsContent>
          </Tabs>
        </form>

        <QueryState
          isLoading={false}
          isError={Boolean(latestMutationResult && !latestMutationResult.ok)}
          isEmpty={false}
          successMessage={latestMutationResult?.ok ? "Note request completed successfully." : undefined}
        />
      </div>
    </Drawer>
  );
}
