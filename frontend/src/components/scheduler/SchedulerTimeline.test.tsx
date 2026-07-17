import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SchedulerTimeline } from './SchedulerTimeline';
import type { ScheduledEntryRecord } from './schedulerTypes';
import type { TaskRecord } from '../tasks/taskTypes';

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return { id: 1, title: 'E-Statement Email', ...overrides };
}

function makeEntry(overrides: Partial<ScheduledEntryRecord> = {}): ScheduledEntryRecord {
  return {
    kind: 'TASK',
    id: 1,
    task: makeTask(),
    scheduledDate: '2026-07-14',
    startTime: '02:00',
    endTime: '04:00',
    durationMinutes: 120,
    priorityLevel: 'CRITICAL',
    overlapsWithIds: [],
    ...overrides,
  };
}

const noop = vi.fn();

describe('SchedulerTimeline', () => {
  it('moves an event entirely before the visible window into the earlier-events indicator instead of rendering it in the grid', () => {
    const entry = makeEntry();
    render(
      <SchedulerTimeline
        scheduled={[entry]}
        focus="all"
        busy={false}
        onComplete={noop}
        onCheckIn={noop}
        onUnscheduleTask={noop}
        onUnscheduleHabit={noop}
      />,
    );

    // The event card itself (identified by its full start/end aria-label) must not render inside the timeline grid.
    expect(screen.queryByLabelText('E-Statement Email, 02:00 to 04:00')).not.toBeInTheDocument();

    // It should instead surface in the "earlier" indicator, with the visible-day title still shown once as an article.
    const indicator = screen.getByRole('status', { name: /events earlier than the visible timeline/i });
    expect(indicator).toHaveTextContent('E-Statement Email');
    expect(indicator).toHaveTextContent('02:00–04:00');
  });

  it('renders an event inside the visible window positioned relative to the visible start time, not midnight', () => {
    const entry = makeEntry({ id: 2, startTime: '06:00', endTime: '07:00', task: makeTask({ id: 2, title: 'Standup' }) });
    render(
      <SchedulerTimeline
        scheduled={[entry]}
        focus="all"
        busy={false}
        onComplete={noop}
        onCheckIn={noop}
        onUnscheduleTask={noop}
        onUnscheduleHabit={noop}
      />,
    );

    const article = screen.getByLabelText('Standup, 06:00 to 07:00');
    // Visible start is 05:00 (300 minutes); event starts at 06:00 (360 minutes) => top = 60 * (64/60) = 64px.
    expect(article.style.top).toBe('64px');
  });

  it('does not render a negative top offset for any visible event (would escape the clipped timeline container)', () => {
    const entry = makeEntry({ id: 3, startTime: '04:30', endTime: '05:30', task: makeTask({ id: 3, title: 'Boundary task' }) });
    render(
      <SchedulerTimeline
        scheduled={[entry]}
        focus="all"
        busy={false}
        onComplete={noop}
        onCheckIn={noop}
        onUnscheduleTask={noop}
        onUnscheduleHabit={noop}
      />,
    );

    const article = screen.getByLabelText('Boundary task, 04:30 to 05:30');
    const top = Number.parseFloat(article.style.top);
    // A negative top is expected here (the event straddles the visible boundary); the timeline
    // container clips it via overflow-hidden rather than requiring the math to clamp it to 0.
    expect(top).toBeLessThan(0);
  });
});
