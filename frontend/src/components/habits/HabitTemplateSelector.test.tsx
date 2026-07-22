import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HabitTemplateSelector } from './HabitTemplateSelector';
import { HABIT_PRESETS } from './habitTypes';

describe('HabitTemplateSelector', () => {
  it('renders every existing and new template', () => {
    render(<HabitTemplateSelector onSelect={vi.fn()} />);

    for (const preset of HABIT_PRESETS) {
      expect(screen.getByRole('button', { name: preset.label })).toBeInTheDocument();
    }
  });

  it('groups templates under their category headings', () => {
    render(<HabitTemplateSelector onSelect={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'Health habit templates' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Study habit templates' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Work habit templates' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Personal habit templates' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Family habit templates' })).toBeInTheDocument();

    const healthGroup = screen.getByRole('group', { name: 'Health habit templates' });
    expect(within(healthGroup).getByRole('button', { name: 'Walk' })).toBeInTheDocument();
    expect(within(healthGroup).queryByRole('button', { name: 'Journal' })).not.toBeInTheDocument();
  });

  it('filters templates by label', async () => {
    const user = userEvent.setup();
    render(<HabitTemplateSelector onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText('Search templates'), 'journal');

    expect(screen.getByRole('button', { name: 'Journal' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Meditate' })).not.toBeInTheDocument();
  });

  it('filters templates by description', async () => {
    const user = userEvent.setup();
    render(<HabitTemplateSelector onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText('Search templates'), 'grateful');

    expect(screen.getByRole('button', { name: 'Gratitude' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Study' })).not.toBeInTheDocument();
  });

  it('shows an empty state when no template matches the search', async () => {
    const user = userEvent.setup();
    render(<HabitTemplateSelector onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText('Search templates'), 'zzzznomatch');

    expect(screen.getByText('No templates match your search')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Journal' })).not.toBeInTheDocument();
  });

  it('marks the selected template with the accessible pressed state', () => {
    render(<HabitTemplateSelector selectedLabel="Deep work" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Deep work' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Study' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the matching preset when a template is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<HabitTemplateSelector onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Call family' }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ label: 'Call family', area: 'FAMILY', goalType: 'COMPLETE_ONCE' }));
  });
});
