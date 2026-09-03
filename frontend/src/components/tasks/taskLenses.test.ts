import { describe, expect, it } from 'vitest';
import {
  countTaskLenses,
  countTaskSignals,
  isFollowUpDue,
  isTaskLens,
  matchesLens,
  matchesSignal,
  taskWorkState,
} from './taskLenses';
import type { TaskRecord } from './taskTypes';
import type { TaskStatus } from '../../validation/taskStatus';

const task = (overrides: Partial<TaskRecord> = {}): TaskRecord => ({ id: 1, title: 'Task', ...overrides });

const ALL_STATUSES: TaskStatus[] = ['BACKLOG', 'NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE', 'CANCELLED'];

describe('taskWorkState - backend-authoritative readiness (issue #282/#296/#297/#304)', () => {
  it('never derives ready from !blocked, for any workflow status', () => {
    ALL_STATUSES.forEach((status) => {
      // The regression case: not dependency-blocked, but the backend says it is not actionable.
      expect(taskWorkState(task({ status, blocked: false, ready: false }))).toBe('waiting');
      // Actionable only when the backend says so.
      expect(taskWorkState(task({ status, blocked: false, ready: true }))).toBe('ready');
      // blocked wins over ready, so a blocked task can never be presented as actionable.
      expect(taskWorkState(task({ status, blocked: true, ready: true }))).toBe('blocked');
      expect(taskWorkState(task({ status, blocked: true, ready: false }))).toBe('blocked');
    });
  });

  it('treats a task with neither field present as waiting, not ready', () => {
    expect(taskWorkState(task())).toBe('waiting');
  });

  it('keeps WAITING and BACKLOG tasks with blocked=false out of the Ready lens', () => {
    const waiting = task({ id: 2, status: 'WAITING', blocked: false, ready: false });
    const backlog = task({ id: 3, status: 'BACKLOG', blocked: false, ready: false });
    const manuallyBlocked = task({ id: 4, status: 'BLOCKED', blocked: false, ready: false });

    [waiting, backlog, manuallyBlocked].forEach((candidate) => {
      expect(matchesLens(candidate, 'ready')).toBe(false);
      expect(matchesLens(candidate, 'blocked')).toBe(false);
      expect(matchesLens(candidate, 'waiting')).toBe(true);
      expect(matchesLens(candidate, 'all')).toBe(true);
    });
  });
});

describe('lens and signal counts', () => {
  const scope = [
    task({ id: 1, ready: true, blocked: false }),
    task({ id: 2, ready: true, blocked: false, important: true }),
    task({ id: 3, ready: false, blocked: true }),
    task({ id: 4, status: 'WAITING', ready: false, blocked: false }),
    task({ id: 5, ready: true, blocked: false, overdue: true }),
  ];

  it('partitions the scope exactly across ready/blocked/waiting', () => {
    const counts = countTaskLenses(scope);
    expect(counts).toEqual({ all: 5, ready: 3, blocked: 1, waiting: 1 });
    expect(counts.ready + counts.blocked + counts.waiting).toBe(counts.all);
  });

  it('counts signals independently of the work-state lens', () => {
    expect(countTaskSignals(scope)).toEqual({ overdue: 1, followUp: 0, important: 1 });
  });
});

describe('signals', () => {
  it('treats an overdue task as overdue via the backend flag', () => {
    expect(matchesSignal(task({ overdue: true }), 'overdue')).toBe(true);
    expect(matchesSignal(task({ overdue: false }), 'overdue')).toBe(false);
  });

  it('only counts a follow-up once its date has arrived', () => {
    const now = new Date('2026-09-03T00:00:00');
    expect(isFollowUpDue(task({ followUpDate: '2026-09-02' }), now)).toBe(true);
    expect(isFollowUpDue(task({ followUpDate: '2026-09-03' }), now)).toBe(true);
    expect(isFollowUpDue(task({ followUpDate: '2026-09-04' }), now)).toBe(false);
    expect(isFollowUpDue(task(), now)).toBe(false);
  });
});

describe('isTaskLens', () => {
  it('accepts only known lens values so a hand-edited URL cannot break the page', () => {
    expect(isTaskLens('ready')).toBe(true);
    expect(isTaskLens('blocked')).toBe(true);
    expect(isTaskLens('waiting')).toBe(true);
    expect(isTaskLens('all')).toBe(true);
    expect(isTaskLens('nonsense')).toBe(false);
  });
});
