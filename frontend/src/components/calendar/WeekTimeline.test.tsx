import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WeekTimeline, type WeekDay } from './WeekTimeline';

function makeDays(overrides: Partial<Record<string, WeekDay['entries']>> = {}): WeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = `2026-07-${String(13 + index).padStart(2, '0')}`;
    return { dateKey, entries: overrides[dateKey] ?? [] };
  });
}

function renderWeek(days: WeekDay[], onReschedule = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/calendar/week']}>
      <Routes>
        <Route path="/calendar/week" element={<WeekTimeline days={days} busy={false} onReschedule={onReschedule} />} />
        <Route path="/tasks/:id" element={<p>Task detail page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WeekTimeline', () => {
  it('renders one column per day with an empty-state message when nothing is scheduled', () => {
    renderWeek(makeDays());
    expect(screen.getAllByText('Nothing scheduled')).toHaveLength(7);
  });

  it('shows a scheduled entry inside its day column with a formatted time', () => {
    const days = makeDays({
      '2026-07-15': [{ kind: 'TASK', id: 1, taskId: 1, title: 'Ship release', startTime: '14:30', durationMinutes: 60 }],
    });
    renderWeek(days);

    expect(screen.getByRole('button', { name: /Ship release/ })).toBeInTheDocument();
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('navigates to the task detail page when a task entry is clicked', async () => {
    const user = userEvent.setup();
    const days = makeDays({
      '2026-07-15': [{ kind: 'TASK', id: 7, taskId: 7, title: 'Ship release', startTime: '09:00', durationMinutes: 30 }],
    });
    renderWeek(days);

    await user.click(screen.getByRole('button', { name: /Ship release/ }));
    expect(await screen.findByText('Task detail page')).toBeInTheDocument();
  });

  it('sorts multiple entries in a day by start time', () => {
    const days = makeDays({
      '2026-07-15': [
        { kind: 'TASK', id: 1, taskId: 1, title: 'Afternoon task', startTime: '15:00', durationMinutes: 30 },
        { kind: 'HABIT', id: 2, title: 'Morning habit', startTime: '07:00', durationMinutes: 15 },
      ],
    });
    renderWeek(days);

    const buttons = screen.getAllByRole('button', { name: /Afternoon task|Morning habit/ });
    expect(buttons[0]).toHaveTextContent('Morning habit');
    expect(buttons[1]).toHaveTextContent('Afternoon task');
  });
});
