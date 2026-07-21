import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementContext } from '../../announcementContext';
import { QuickCaptureModal } from './QuickCaptureModal';

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AnnouncementContext.Provider value={{ message: '', announce: vi.fn() }}>
          <QuickCaptureModal open onOpenChange={vi.fn()} />
        </AnnouncementContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network disabled in tests')));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QuickCaptureModal', () => {
  it('defaults to Task mode with a natural-language input and a simple field set', () => {
    renderModal();

    expect(screen.getByRole('tab', { name: 'Task', selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Type naturally')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Due date')).toBeInTheDocument();
    expect(screen.getByLabelText('Project / area')).toBeInTheDocument();
  });

  it('live-parses natural language into the simple fields', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Type naturally'), 'Buy milk tomorrow #work');

    expect(screen.getByLabelText('Title')).toHaveValue('Buy milk');
    expect(screen.getByLabelText('Project / area')).toHaveValue('WORK');
  });

  it('shows a confirmation notice when the parse is uncertain', async () => {
    const user = userEvent.setup();
    renderModal();

    // A time with no explicit date is a guess (defaults to today) -- worth confirming.
    await user.type(screen.getByLabelText('Type naturally'), 'Call supplier 3pm');

    expect(screen.getByRole('status')).toHaveTextContent(/double-check the parsed date/i);
  });

  it('does not show a confirmation notice for a confident parse', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Type naturally'), 'Buy milk tomorrow');

    expect(screen.queryByText(/double-check the parsed date/i)).not.toBeInTheDocument();
  });

  it('preserves a manually edited title against a later parse update', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Type naturally'), 'Buy milk tomorrow');
    const titleField = screen.getByLabelText('Title');
    await user.clear(titleField);
    await user.type(titleField, 'Buy oat milk');

    await user.type(screen.getByLabelText('Type naturally'), ' #work');

    expect(screen.getByLabelText('Title')).toHaveValue('Buy oat milk');
  });

  it('switches to Note mode with a title and body field', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('tab', { name: 'Note' }));

    expect(screen.getByRole('tab', { name: 'Note', selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
    expect(screen.queryByLabelText('Type naturally')).not.toBeInTheDocument();
  });

  it('switches to Habit mode with a title and category field', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('tab', { name: 'Habit' }));

    expect(screen.getByRole('tab', { name: 'Habit', selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });
});
