import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
