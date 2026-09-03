import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatEnumLabel } from '../../../lib/enumLabels';
import { NOTE_TYPE_ICON } from '../noteTypeIcons';
import { NOTE_TYPE_VALUES, type NoteContentType, type NoteRecord, type NoteType } from '../noteTypes';
import { NOTE_CONTENT_TYPES, humanizeContentType } from '../notesPageHelpers';
import type { ProjectRecord } from '../../projects/projectTypes';
import type { TaskRecord } from '../../tasks/taskTypes';
import { Badge, Button, Field, Input, Select, cn } from '../../ui';
import { ChevronDown, Link2 } from '../../ui/icons';

export interface NoteProperties {
  projectId: string;
  noteType: NoteType;
  collectionId: string;
  taskId: string;
  tags: string;
  contentType: NoteContentType;
}

interface NotePagePropertiesProps {
  properties: NoteProperties;
  onChange: (patch: Partial<NoteProperties>) => void;
  projects: ProjectRecord[];
  collections: Array<{ id: number; name: string }>;
  tasks: TaskRecord[];
  note: NoteRecord | null;
  disabled?: boolean;
}

/**
 * Page properties (issue #299 follow-up).
 *
 * Collapsed, the note's context reads as one quiet line under the title - the way a document
 * header reads, not a form. Expanding turns the same values into labelled controls. Nothing has
 * to be filled in before writing, and none of it competes with the content for attention.
 *
 * The summary is a real `<button>` that reports `aria-expanded`, so the properties are reachable
 * by keyboard and announce their state - the tool's `Compact Control Semantics` result rules out
 * a clickable div here.
 */
export function NotePageProperties({
  properties,
  onChange,
  projects,
  collections,
  tasks,
  note,
  disabled,
}: NotePagePropertiesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const TypeIcon = NOTE_TYPE_ICON[properties.noteType];
  const projectName = projects.find((project) => String(project.id) === properties.projectId)?.name;
  const collectionName = collections.find((collection) => String(collection.id) === properties.collectionId)?.name;
  const tags = properties.tags.split(',').map((tag) => tag.trim()).filter(Boolean);

  return (
    <section aria-label="Note properties" className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className={cn(
          'group flex min-h-9 w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-1 py-1 text-left text-[13px] text-fg-muted transition-colors duration-(--duration-fast)',
          'hover:bg-inset',
        )}
      >
        <TypeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-medium text-fg-muted">{formatEnumLabel(properties.noteType)}</span>
        {projectName ? (
          <>
            <span aria-hidden>·</span>
            <span className="min-w-0 max-w-56 truncate">{projectName}</span>
          </>
        ) : null}
        {collectionName ? (
          <>
            <span aria-hidden>·</span>
            <span className="min-w-0 max-w-40 truncate">{collectionName}</span>
          </>
        ) : null}
        {tags.slice(0, 4).map((tag) => (
          <Badge key={tag} variant="neutral" className="min-w-0">
            <span className="min-w-0 truncate">{tag}</span>
          </Badge>
        ))}
        {tags.length > 4 ? <span className="text-fg-subtle">+{tags.length - 4}</span> : null}
        <ChevronDown
          className={cn('ml-auto h-4 w-4 shrink-0 transition-transform duration-(--duration-fast)', isOpen && 'rotate-180')}
          aria-hidden
        />
        <span className="sr-only">{isOpen ? 'Hide note properties' : 'Edit note properties'}</span>
      </button>

      {isOpen ? (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-inset/40 p-3 sm:grid-cols-2">
          <Field label="Project" htmlFor="notePageProject">
            <Select
              id="notePageProject"
              value={properties.projectId}
              disabled={disabled}
              onChange={(event) => onChange({ projectId: event.target.value })}
            >
              <option value="">No project</option>
              {projects.map((project) => (
                <option key={project.id} value={String(project.id)}>{project.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Note type" htmlFor="notePageType">
            <Select
              id="notePageType"
              value={properties.noteType}
              disabled={disabled}
              onChange={(event) => onChange({ noteType: event.target.value as NoteType })}
            >
              {NOTE_TYPE_VALUES.map((type) => (
                <option key={type} value={type}>{formatEnumLabel(type)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Collection" htmlFor="notePageCollection">
            <Select
              id="notePageCollection"
              value={properties.collectionId}
              disabled={disabled}
              onChange={(event) => onChange({ collectionId: event.target.value })}
            >
              <option value="">No collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={String(collection.id)}>{collection.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Linked task" htmlFor="notePageTask">
            <Select
              id="notePageTask"
              value={properties.taskId}
              disabled={disabled}
              onChange={(event) => onChange({ taskId: event.target.value })}
            >
              <option value="">No linked task</option>
              {tasks.map((task) => (
                <option key={task.id} value={String(task.id)}>{task.title}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Tags"
            htmlFor="notePageTags"
            className="sm:col-span-2"
            hint="Comma separated. Tag a note “archived” to move it out of your working set."
          >
            <Input
              id="notePageTags"
              value={properties.tags}
              placeholder="backend, adr, paci"
              disabled={disabled}
              onChange={(event) => onChange({ tags: event.target.value })}
            />
          </Field>
          <Field label="Content type" htmlFor="notePageContentType" hint="Code types render highlighted in the library.">
            <Select
              id="notePageContentType"
              value={properties.contentType}
              disabled={disabled}
              onChange={(event) => onChange({ contentType: event.target.value as NoteContentType })}
            >
              {NOTE_CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>{humanizeContentType(type)}</option>
              ))}
            </Select>
          </Field>

          {note?.taskLinks?.length ? (
            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
              <p className="text-[13px] font-medium text-fg-muted">Linked tasks</p>
              <div className="flex flex-wrap gap-1.5">
                {note.taskLinks.map((link) => (
                  <Link key={link.id} to={`/tasks/${link.taskId}`}>
                    <Badge variant="neutral" className="min-w-0">
                      <Link2 className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="min-w-0 truncate">#{link.taskId} {link.taskTitle ?? 'Task'}</span>
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Button size="sm" onClick={() => setIsOpen(false)}>Done</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
