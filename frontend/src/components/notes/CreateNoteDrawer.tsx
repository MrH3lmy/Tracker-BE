import { useEffect, type ClipboardEvent, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import { QueryState } from "../QueryState";
import styles from "./NotesPage.module.css";
import { NoteBlockEditor, blocksFromBody, bodyFromBlocks, type DraftNoteBlock } from "./NoteBlockEditor";
import type { NoteAiAction, NoteAiGenerationRecord, NoteContentType, NoteRecord, NoteTemplateRecord } from "./noteTypes";
import { NOTE_CONTENT_TYPES, formatDate, humanizeContentType, type NoteFormState } from "./notesPageHelpers";
import type { TaskRecord } from "../tasks/taskTypes";

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
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.createNoteDrawerBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className={styles.createNoteDrawer} role="dialog" aria-modal="true" aria-labelledby="note-form-title">
      <section
        className="page-card main-content-card"
        aria-labelledby="note-form-title"
      >
        <div className="section-header">
          <div>
            <h3 id="note-form-title" ref={noteFormTitleRef} tabIndex={-1}>
              {editingNoteId === null ? "Create note" : "Edit note"}
            </h3>
            <p className="muted">
              Notes require a title, content type, and body. Task IDs link notes
              to tasks while keeping task descriptions separate.
            </p>
          </div>
          <div className={`row compact-row ${styles.centerRow}`}>
            <button type="button" aria-label="Close note drawer" onClick={onClose} disabled={isBusy}>
              Close
            </button>
            <div className="field-stack align-end">
              <button
                type="submit"
                form="note-form"
                className="button-primary"
                disabled={!canSubmit}
              >
                {isBusy ? "Saving..." : "Save note"}
              </button>
              {!canSubmit ? (
                <span className="muted">
                  Title and body are required before saving.
                </span>
              ) : null}
            </div>
          </div>
        </div>


        <div className={`config-panel ${styles.templatePanel}`}>
          <div className="section-header">
            <div>
              <h4>New from template</h4>
              <p className="muted">Pick a default template, preview the rendered note, and fill variables like task title, date, area, priority, and due date.</p>
            </div>
            <button type="button" className="button-primary" disabled={!canCreateFromTemplate} onClick={handleCreateFromTemplate}>
              {isCreateFromTemplatePending ? "Creating..." : "Create from template"}
            </button>
          </div>
          <div className={`row ${styles.endWrapRow}`}>
            <label className={`field-stack ${styles.templateSelectField}`}>
              <span>Template</span>
              <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} disabled={templatesQueryIsLoading}>
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={String(template.id)}>{template.category ? `${template.category} · ` : ""}{template.name}</option>
                ))}
              </select>
            </label>
            {templateVariableKeys.map((key) => (
              <label key={key} className={`field-stack ${styles.templateVariableField}`}>
                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                <input type={key.toLowerCase().includes("date") ? "date" : "text"} value={templateVariables[key]} onChange={(event) => setTemplateVariables((current) => ({ ...current, [key]: event.target.value }))} />
              </label>
            ))}
          </div>
          {selectedTemplate ? (
            <div className={`panel ${styles.templatePreviewPanel}`}>
              <strong>{selectedTemplate.name}</strong>
              <p className="muted">{selectedTemplate.description}</p>
              <pre className={`text-block ${styles.templatePreviewContent}`}>{renderedTemplatePreview}</pre>
            </div>
          ) : null}
        </div>

        <form id="note-form" onSubmit={handleSubmit} className="config-panel">
          <div className={`row ${styles.endWrapRow}`}>
            <label
              className={`field-stack ${styles.titleField}`}
              htmlFor="noteTitle"
            >
              <span>Title</span>
              <input
                id="noteTitle"
                ref={noteTitleInputRef}
                value={activeForm.title}
                maxLength={255}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label
              className={`field-stack ${styles.contentTypeField}`}
              htmlFor="noteContentType"
            >
              <span>Content type</span>
              <select
                id="noteContentType"
                value={activeForm.contentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contentType: event.target.value as NoteContentType,
                  }))
                }
              >
                {NOTE_CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {humanizeContentType(type)}
                  </option>
                ))}
              </select>
            </label>
            <label
              className={`field-stack ${styles.linkedTaskField}`}
              htmlFor="noteTaskId"
            >
              <span>Linked task (optional)</span>
              <select
                id="noteTaskId"
                value={activeForm.taskId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    taskId: event.target.value,
                  }))
                }
              >
                <option value="">No linked task</option>
                {availableTasks.map((task) => (
                  <option key={task.id} value={String(task.id)}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>
            <label className={`field-stack ${styles.collectionField}`} htmlFor="noteCollectionId">
              <span>Collection</span>
              <select id="noteCollectionId" value={activeForm.collectionId} onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}>
                <option value="">No collection</option>
                {collections.map((collection) => <option key={collection.id} value={String(collection.id)}>{collection.name}</option>)}
              </select>
            </label>
            <label className={`field-stack ${styles.filterDateField}`} htmlFor="noteDate">
              <span>Date</span>
              <input id="noteDate" type="date" value={noteDate} readOnly />
            </label>
            <label
              className={`field-stack ${styles.tagsField}`}
              htmlFor="noteTags"
            >
              <span>Tags</span>
              <input
                id="noteTags"
                value={activeForm.tags}
                placeholder="Comma-separated tags"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tags: event.target.value,
                  }))
                }
              />
            </label>
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
          <div className="row compact-row">
            <button type="button" disabled={editingNoteId === null || availableTasks.length === 0 || isBusy} onClick={handleTaskMentionShortcut}>
              Link @task mention
            </button>
            <span className="muted">Type @task or /task in the note, select text, then link it to the current or first loaded task.</span>
          </div>
          <div className={`config-panel ${styles.aiReviewPanel}`} aria-label="AI actions review">
            <div className="section-header">
              <div>
                <h4>AI actions</h4>
                <p className="muted">Generate summaries, task candidates, decisions, rewrites, or task plans for review. Suggestions are stored separately with audit metadata and tasks are never auto-created.</p>
              </div>
              <span className={aiFeaturesEnabled ? "status-badge status-done" : "status-badge status-other"}>{aiFeaturesEnabled ? "Enabled" : "Disabled in settings"}</span>
            </div>
            <div className="row compact-row" role="menu" aria-label="AI actions menu">
              {aiNoteActions.map((item) => (
                <button key={item.action} type="button" role="menuitem" disabled={!aiFeaturesEnabled || editingNoteId === null || !activeForm.body.trim() || isBusy} onClick={() => runAiActionForNote(item.action)}>
                  {item.label}
                </button>
              ))}
            </div>
            {!aiFeaturesEnabled ? <p className="muted">Turn on <code>aiFeaturesEnabled</code> in Settings only when AI assistance is acceptable for your offline/privacy posture.</p> : null}
            {aiReviewSuggestion ? (
              <div className={`panel ${styles.aiReviewSuggestion}`}>
                <p className="eyebrow">Review before applying · {aiReviewSuggestion.provider} {aiReviewSuggestion.model ? `(${aiReviewSuggestion.model})` : ""}</p>
                <pre className={`text-block ${styles.aiReviewContent}`}>{aiReviewSuggestion.generatedContent}</pre>
                <p className="muted">Audit: generated={String(aiReviewSuggestion.generated)} · action={aiReviewSuggestion.action} · source hash {aiReviewSuggestion.sourceHash.slice(0, 12)}…</p>
                <div className="row compact-row">
                  <button type="button" className="button-primary" onClick={appendAiSuggestionToBody}>Append to note body</button>
                  <button type="button" onClick={() => setAiReviewSuggestion(null)}>Dismiss</button>
                  {(aiReviewSuggestion.action === 'EXTRACT_TASKS' || aiReviewSuggestion.action === 'CREATE_TASK_PLAN') ? <span className="muted">Confirm tasks manually with the existing conversion flow.</span> : null}
                </div>
              </div>
            ) : aiGenerations.length > 0 ? (
              <p className="muted">Latest stored AI suggestion: {aiGenerations[0].action.toLowerCase().replaceAll('_', ' ')} generated {formatDate(aiGenerations[0].createdAt)}.</p>
            ) : null}
          </div>
          <div className="row compact-row">
            <button
              type="button"
              className="secondary-action"
              aria-expanded={showRawBody}
              aria-controls="raw-note-body-panel"
              onClick={() => setShowRawBody((current) => !current)}
            >
              {showRawBody ? "Hide raw body" : "Show raw body"}
            </button>
            <span className="muted">Reveal the API payload body for paste uploads, migrations, or raw edits.</span>
          </div>
          {showRawBody ? (
            <div id="raw-note-body-panel">
              <label className="field-stack" htmlFor="noteBody">
                <span>Raw note body</span>
                <textarea
                  id="noteBody"
                  className="text-block"
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
              </label>
            </div>
          ) : null}
          {editingNoteId !== null && notes.find((note) => note.id === editingNoteId)?.taskLinks?.length ? (
            <div className="row compact-row" aria-label="Linked task chips">
              {notes.find((note) => note.id === editingNoteId)?.taskLinks?.map((link) => (
                <span key={link.id} className="status-badge status-other">
                  <Link to={`/tasks?focusTaskId=${encodeURIComponent(String(link.taskId))}`}>#{link.taskId} {link.taskTitle ?? "Task"}</Link>
                  <button type="button" onClick={() => deleteTaskLink.mutate({ noteId: editingNoteId, linkId: link.id })} disabled={isBusy}>×</button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="row compact-row">
            <button type="button" disabled={editingNoteId === null || !activeForm.body.trim()} onClick={() => {
              const textarea = noteBodyRef.current;
              const selected = textarea && textarea.selectionStart !== textarea.selectionEnd
                ? activeForm.body.slice(textarea.selectionStart, textarea.selectionEnd)
                : activeForm.body;
              onConvertToTask(selected);
            }}>Convert selected text to task</button>
            {editingNoteId === null ? <span className="muted">Save the note before converting selected text.</span> : null}
          </div>
          {clipboardImageMessage ? (
            <p
              className={
                clipboardImageMessage.kind === "error" ? "error-text" : "muted"
              }
              role={clipboardImageMessage.kind === "error" ? "alert" : "status"}
            >
              {clipboardImageMessage.text}
            </p>
          ) : null}
          {pendingClipboardImages.length > 0 ? (
            <div className="muted" role="status">
              <strong>Pending pasted screenshots</strong>
              <ul>
                {pendingClipboardImages.map((image, index) => (
                  <li key={`${image.fileName}-${image.caption}-${index}`}>
                    {image.placeholder} — {image.fileName}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={`save-bar ${styles.saveBarSpacing}`}>
            <div>
              <strong>
                {editingNoteId === null
                  ? "Ready to create"
                  : `Editing note #${editingNoteId}`}
              </strong>
              <p className="muted">
                Uses the shared API client against <code>/api/v1/notes</code>.
              </p>
            </div>
            <button type="button" onClick={onClose} disabled={isBusy}>
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary"
              disabled={!canSubmit}
            >
              {isBusy ? "Saving..." : "Save note"}
            </button>
          </div>
        </form>

        <QueryState
          isLoading={false}
          isError={Boolean(latestMutationResult && !latestMutationResult.ok)}
          isEmpty={false}
          successMessage={
            latestMutationResult?.ok
              ? "Note request completed successfully."
              : undefined
          }
        />
      </section>
      </aside>
    </div>

  );
}
