import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NoteCard } from './NoteCard';
import type { NoteRecord } from './noteTypes';

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: 1,
    title: 'Note',
    body: '',
    contentType: 'PLAIN_TEXT',
    ...overrides,
  };
}

describe('NoteCard overflow handling', () => {
  it('clips overflow at the card boundary and wraps a very long, unbroken title instead of forcing the card wider', () => {
    const note = makeNote({ title: 'A'.repeat(200) });
    const { container } = render(<NoteCard note={note} layout="row" subtitle={null} actions={null} />);

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('overflow-hidden');
    expect(card.className).toContain('min-w-0');

    const title = screen.getByRole('heading', { level: 4 });
    expect(title.className).toContain('break-words');
    expect(title).toHaveTextContent('A'.repeat(200));
  });

  it('keeps long code/text content inside a horizontally scrollable region rather than overflowing the card', () => {
    const note = makeNote({ body: 'x'.repeat(2000), contentType: 'SHELL_COMMANDS' });
    const { container } = render(<NoteCard note={note} layout="row" subtitle={null} actions={null} />);

    const codePreview = container.querySelector('.code-preview');
    const codeBody = container.querySelector('.code-preview__body');
    expect(codePreview).not.toBeNull();
    expect(codeBody).not.toBeNull();
    expect(codeBody).toHaveTextContent('x'.repeat(50));
  });

  it('never lets a screenshot attachment overflow the card', () => {
    const note = makeNote({
      attachments: [
        { id: 1, kind: 'SCREENSHOT', fileName: 'shot.png', contentType: 'image/png', sizeBytes: 1024, downloadUrl: 'https://example.test/shot.png' },
      ],
    });
    const { container } = render(<NoteCard note={note} layout="row" subtitle={null} actions={null} />);

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    expect(image?.className).toContain('max-w-full');
  });
});

describe('NoteCard structured actions (issue #296)', () => {
  it('offers to convert a persisted checklist block that has no task yet, passing the real block id', async () => {
    const note = makeNote({
      blocks: [{ id: 42, noteId: 1, type: 'checklist', content: 'Send the follow-up email', position: 0, checked: false }],
    });
    const onConvertBlock = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteCard note={note} layout="row" subtitle={null} actions={null} onConvertBlock={onConvertBlock} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Send the follow-up email')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Convert to task' }));

    expect(onConvertBlock).toHaveBeenCalledWith(note, note.blocks![0]);
  });

  it('shows an already-converted action item as a link to its task instead of a convert button', () => {
    const note = makeNote({
      blocks: [{ id: 42, noteId: 1, type: 'checklist', content: 'Send the follow-up email', position: 0, checked: false }],
      taskLinks: [{ id: 1, noteId: 1, blockId: 42, taskId: 99, taskTitle: 'Send the follow-up email' }],
    });
    render(
      <MemoryRouter>
        <NoteCard note={note} layout="row" subtitle={null} actions={null} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Convert to task' })).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Task created/ });
    expect(link).toHaveAttribute('href', '/tasks/99');
  });
});

describe('NoteCard result hierarchy (issue #299)', () => {
  it('leads with identity then context: title, then type, project, collection and freshness', () => {
    const note = makeNote({
      title: 'Why we chose PostgreSQL',
      noteType: 'DECISION',
      collectionName: 'Architecture',
      updatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      body: 'We compared PostgreSQL and MySQL on JSON indexing and settled on PostgreSQL.',
    });
    render(
      <MemoryRouter>
        <NoteCard note={note} layout="row" actions={null} projectName="Tracker Mobile App" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Why we chose PostgreSQL');
    expect(screen.getByText('Decision')).toBeInTheDocument();
    expect(screen.getByText('Tracker Mobile App')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
    expect(screen.getByText('40m ago')).toBeInTheDocument();
    expect(screen.getByText(/We compared PostgreSQL and MySQL/)).toBeInTheDocument();
  });

  it('gives prose notes a plain excerpt instead of the code-editor chrome', () => {
    const note = makeNote({ contentType: 'MARKDOWN', body: '# Heading\n\nA plain paragraph of prose.' });
    const { container } = render(<NoteCard note={note} layout="row" actions={null} />);

    expect(container.querySelector('.code-preview')).toBeNull();
    expect(screen.getByText(/A plain paragraph of prose/)).toBeInTheDocument();
  });

  it('renders no signal row at all for a note with nothing actionable', () => {
    const note = makeNote({ body: 'Just a thought.' });
    render(<NoteCard note={note} layout="row" actions={null} />);

    expect(screen.queryByText(/action item/)).not.toBeInTheDocument();
    expect(screen.queryByText(/screenshot/)).not.toBeInTheDocument();
  });

  it('summarises open versus converted action items before listing them', () => {
    const note = makeNote({
      blocks: [
        { id: 1, noteId: 1, type: 'checklist', content: 'Investigate callback retry', position: 0, checked: false },
        { id: 2, noteId: 1, type: 'checklist', content: 'Update API docs', position: 1, checked: false },
      ],
      taskLinks: [{ id: 9, noteId: 1, blockId: 2, taskId: 318 }],
    });
    render(
      <MemoryRouter>
        <NoteCard note={note} layout="row" actions={null} onConvertBlock={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/1 open action item/)).toBeInTheDocument();
    expect(screen.getByText(/1 converted/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert to task' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Task created/ })).toHaveAttribute('href', '/tasks/318');
  });

  it('caps a long action list and reveals the rest on request', async () => {
    const note = makeNote({
      blocks: Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        noteId: 1,
        type: 'checklist' as const,
        content: `Action ${index + 1}`,
        position: index,
        checked: false,
      })),
    });
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteCard note={note} layout="row" actions={null} onConvertBlock={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Action 3')).toBeInTheDocument();
    expect(screen.queryByText('Action 6')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all 6 action items' }));
    expect(screen.getByText('Action 6')).toBeInTheDocument();
  });

  it('shows screenshots as lazy thumbnails that still link to the full attachment', () => {
    const note = makeNote({
      attachments: [
        { id: 1, kind: 'SCREENSHOT', fileName: 'crash.png', contentType: 'image/png', sizeBytes: 10, caption: 'Crash dialog', downloadUrl: 'https://example.test/a.png' },
        { id: 2, kind: 'SCREENSHOT', fileName: 'trace.png', contentType: 'image/png', sizeBytes: 10, downloadUrl: 'https://example.test/b.png' },
      ],
    });
    render(<NoteCard note={note} layout="row" actions={null} />);

    expect(screen.getByText('2 screenshots')).toBeInTheDocument();
    const image = screen.getByAltText('Crash dialog');
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image.closest('a')).toHaveAttribute('href', 'https://example.test/a.png');
    // A file with no caption still gets a real alt text, never an empty one.
    expect(screen.getByAltText(/trace\.png/)).toBeInTheDocument();
  });

  it('caps a long tag list behind an operable +N control rather than a hover tooltip', async () => {
    const note = makeNote({ tags: Array.from({ length: 12 }, (_, index) => `tag-${index + 1}`) });
    const user = userEvent.setup();
    render(<NoteCard note={note} layout="row" actions={null} />);

    expect(screen.getByText('tag-4')).toBeInTheDocument();
    expect(screen.queryByText('tag-12')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+8' }));
    expect(screen.getByText('tag-12')).toBeInTheDocument();
  });

  it('surfaces the linked task as a signal without letting a long title widen the card', () => {
    const note = makeNote({ taskId: 77 });
    const { container } = render(
      <NoteCard note={note} layout="row" actions={null} linkedTaskTitle={'A very long linked task title '.repeat(6)} />,
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('overflow-hidden');
    expect(screen.getByTitle(/A very long linked task title/)).toHaveClass('truncate');
  });
});
