import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MonthGrid } from './MonthGrid';

describe('MonthGrid', () => {
  it('renders a 7-column grid with the correct number of weeks for the month', () => {
    // July 2026 starts on a Wednesday and has 31 days -- 5 week rows, 35 cells.
    render(<MonthGrid year={2026} month={7} tasksByDay={{}} onDayClick={vi.fn()} onTaskClick={vi.fn()} />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(35);
  });

  it('shows a task title inside its due-date cell and lets it be clicked to view the task', async () => {
    const onTaskClick = vi.fn();
    const user = userEvent.setup();
    render(
      <MonthGrid
        year={2026}
        month={7}
        tasksByDay={{ '2026-07-15': [{ id: 42, title: 'Ship release', status: 'NOT_STARTED' }] }}
        onDayClick={vi.fn()}
        onTaskClick={onTaskClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ship release' }));
    expect(onTaskClick).toHaveBeenCalledWith(42);
  });

  it('clicking a day number calls onDayClick with that date', async () => {
    const onDayClick = vi.fn();
    const user = userEvent.setup();
    render(<MonthGrid year={2026} month={7} tasksByDay={{}} onDayClick={onDayClick} onTaskClick={vi.fn()} />);

    await user.click(screen.getByLabelText('Add a task on Wednesday, Jul 15, 2026'));
    expect(onDayClick).toHaveBeenCalledWith('2026-07-15');
  });

  it('shows an overflow indicator when a day has more than 3 tasks', () => {
    const tasks = Array.from({ length: 5 }, (_, index) => ({ id: index, title: `Task ${index}`, status: 'NOT_STARTED' }));
    render(<MonthGrid year={2026} month={7} tasksByDay={{ '2026-07-10': tasks }} onDayClick={vi.fn()} onTaskClick={vi.fn()} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('marks a past day with unfinished tasks as overdue', () => {
    render(
      <MonthGrid
        year={2020}
        month={1}
        tasksByDay={{ '2020-01-10': [{ id: 1, title: 'Old task', status: 'NOT_STARTED' }] }}
        onDayClick={vi.fn()}
        onTaskClick={vi.fn()}
      />,
    );
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });
});
