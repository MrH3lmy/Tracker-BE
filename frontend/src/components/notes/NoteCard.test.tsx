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

    const title = screen.getByRole('heading', { level: 3 });
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
