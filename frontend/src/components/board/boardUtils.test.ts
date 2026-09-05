import { describe, expect, it } from 'vitest';
import type { TaskRecord } from '../tasks/taskTypes';
import type { BoardColumnRecord } from './boardTypes';
import { blockedShare, buildColumnModels, columnCounts, summariseBoard } from './boardUtils';

const task = (overrides: Partial<TaskRecord> & { id: number }): TaskRecord => ({
  title: `Task ${overrides.id}`,
  ...overrides,
});

const columns: BoardColumnRecord[] = [
  { id: 1, name: 'To do', position: 0 },
  { id: 2, name: 'Done', position: 1 },
];

describe('columnCounts - backend readiness is summed, never derived', () => {
  it('counts blocked and ready independently of one another', () => {
    const counts = columnCounts([
      // Backend truth: a task can be blocked and not ready...
      task({ id: 1, blocked: true, ready: false }),
      // ...ready and not blocked...
      task({ id: 2, blocked: false, ready: true }),
      // ...or, per the API contract, both at once.
      task({ id: 3, blocked: true, ready: true }),
      // ...or neither.
      task({ id: 4 }),
    ]);

    expect(counts).toEqual({ total: 4, blocked: 2, ready: 2, overdue: 0 });
  });

  it('never infers ready from the absence of blocked', () => {
    // Four unblocked tasks, none of which the backend called ready.
    const counts = columnCounts([1, 2, 3, 4].map((id) => task({ id, blocked: false })));

    expect(counts.blocked).toBe(0);
    expect(counts.ready).toBe(0);
  });

  it('counts an overdue task from the backend flag', () => {
    const counts = columnCounts([task({ id: 1, overdue: true }), task({ id: 2 })]);

    expect(counts.overdue).toBe(1);
  });
});

describe('buildColumnModels', () => {
  it('keeps backend column order and attaches each column its own tasks', () => {
    const columnModels = buildColumnModels(
      columns,
      new Map([
        [1, [task({ id: 1, blocked: true })]],
        [2, [task({ id: 2 }), task({ id: 3 })]],
      ]),
    );

    expect(columnModels.map((model) => model.column.name)).toEqual(['To do', 'Done']);
    expect(columnModels[0].counts).toEqual({ total: 1, blocked: 1, ready: 0, overdue: 0 });
    expect(columnModels[1].counts.total).toBe(2);
  });

  it('gives a column with no tasks an empty column rather than dropping it', () => {
    const columnModels = buildColumnModels(columns, new Map());

    expect(columnModels).toHaveLength(2);
    expect(columnModels[1].tasks).toEqual([]);
  });
});

describe('summariseBoard - one atomic status sentence', () => {
  it('names the blocked total when there is one', () => {
    const columnModels = buildColumnModels(
      columns,
      new Map([
        [1, [task({ id: 1, blocked: true }), task({ id: 2 })]],
        [2, [task({ id: 3, blocked: true })]],
      ]),
    );

    expect(summariseBoard(columnModels).text).toBe('3 tasks, 2 blocked');
  });

  it('stays quiet about blockers when nothing is blocked', () => {
    const columnModels = buildColumnModels(columns, new Map([[1, [task({ id: 1 })]]]));

    expect(summariseBoard(columnModels).text).toBe('1 task');
  });

  it('reports an empty board without pluralising wrongly', () => {
    expect(summariseBoard(buildColumnModels(columns, new Map())).text).toBe('0 tasks');
  });
});

describe('blockedShare - the column load bar', () => {
  it('is a percentage of the column, not of the board', () => {
    expect(blockedShare({ total: 4, blocked: 1 })).toBe(25);
    expect(blockedShare({ total: 3, blocked: 3 })).toBe(100);
  });

  it('is zero, not NaN, for an empty column', () => {
    expect(blockedShare({ total: 0, blocked: 0 })).toBe(0);
  });
});
