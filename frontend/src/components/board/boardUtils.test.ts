import { describe, expect, it } from 'vitest';
import type { TaskRecord } from '../tasks/taskTypes';
import type { BoardColumnRecord } from './boardTypes';
import {
  MAX_COLUMN_WIDTH_PX,
  MIN_COLUMN_WIDTH_PX,
  blockedShare,
  buildColumnModels,
  columnCounts,
  fitsAllColumns,
  fittedColumnWidth,
  resolveDrop,
  summariseBoard,
} from './boardUtils';

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

describe('resolveDrop - what a finished drag actually moves', () => {
  // Two columns: 1 holds tasks 1 and 2, column 2 holds task 3.
  const tasks: TaskRecord[] = [
    task({ id: 1, boardColumnId: 1, position: 0 }),
    task({ id: 2, boardColumnId: 1, position: 1 }),
    task({ id: 3, boardColumnId: 2, position: 0 }),
  ];
  const byColumn = new Map<number, TaskRecord[]>([
    [1, [tasks[0], tasks[1]]],
    [2, [tasks[2]]],
  ]);

  it('drops onto another column body by appending to the end of it', () => {
    expect(resolveDrop(1, 'column-2', tasks, byColumn)).toEqual({
      task: tasks[0],
      targetColumnId: 2,
      targetIndex: 1,
    });
  });

  it('drops onto a card in another column at that card’s index', () => {
    // Task 1 dropped on task 3 takes task 3's place at the top of column 2.
    expect(resolveDrop(1, 3, tasks, byColumn)).toEqual({
      task: tasks[0],
      targetColumnId: 2,
      targetIndex: 0,
    });
  });

  it('appends to an empty column rather than failing to find an index', () => {
    const withEmpty = new Map(byColumn).set(3, []);
    expect(resolveDrop(1, 'column-3', tasks, withEmpty)).toEqual({
      task: tasks[0],
      targetColumnId: 3,
      targetIndex: 0,
    });
  });

  it('reorders downward within one column instead of resolving to a no-op', () => {
    // The regression this function was extracted to pin down: dragging the top
    // card onto the one below it must move it, not silently do nothing.
    expect(resolveDrop(1, 2, tasks, byColumn)).toEqual({
      task: tasks[0],
      targetColumnId: 1,
      targetIndex: 1,
    });
  });

  it('reorders upward within one column', () => {
    expect(resolveDrop(2, 1, tasks, byColumn)).toEqual({
      task: tasks[1],
      targetColumnId: 1,
      targetIndex: 0,
    });
  });

  it('sends a card dropped on its own column’s body to the end of it', () => {
    expect(resolveDrop(1, 'column-1', tasks, byColumn)).toEqual({
      task: tasks[0],
      targetColumnId: 1,
      targetIndex: 1,
    });
  });

  it('is not a move when the task lands exactly where it started', () => {
    // Task 2 dropped on its own column body appends at index 1 - where it is.
    expect(resolveDrop(2, 'column-1', tasks, byColumn)).toBeNull();
  });

  it('is not a move when the drag ends over nothing', () => {
    expect(resolveDrop(1, null, tasks, byColumn)).toBeNull();
    expect(resolveDrop(1, undefined, tasks, byColumn)).toBeNull();
  });

  it('is not a move when the dragged task or the target is unknown', () => {
    expect(resolveDrop(999, 'column-2', tasks, byColumn)).toBeNull();
    expect(resolveDrop(1, 'column-nope', tasks, byColumn)).toBeNull();
    expect(resolveDrop(1, 4242, tasks, byColumn)).toBeNull();
  });
});

describe('fitsAllColumns - the board never scrolls sideways or shows a peek', () => {
  it('fits every column when the width divides to at least the usable minimum', () => {
    for (const count of [3, 4, 5]) {
      expect(fitsAllColumns(MIN_COLUMN_WIDTH_PX * count, count)).toBe(true);
    }
  });

  it('refuses one pixel short rather than clipping a column', () => {
    for (const count of [3, 4, 5]) {
      expect(fitsAllColumns(MIN_COLUMN_WIDTH_PX * count - 1, count)).toBe(false);
    }
  });

  it('scales the answer with the configured column count, not a fixed breakpoint', () => {
    // The real content areas the shell leaves beside its sidebar. The same
    // width answers differently depending on how many columns are configured,
    // which is exactly why this cannot be a CSS breakpoint.
    const at1440 = 1176;
    const at1024 = 760;

    expect(fitsAllColumns(at1440, 5)).toBe(true);
    expect(fitsAllColumns(at1440, 4)).toBe(true);
    expect(fitsAllColumns(at1440, 3)).toBe(true);

    expect(fitsAllColumns(at1024, 3)).toBe(true);
    expect(fitsAllColumns(at1024, 4)).toBe(false);
    expect(fitsAllColumns(at1024, 5)).toBe(false);
  });

  it('treats an unmeasured or zero width as not fitting', () => {
    expect(fitsAllColumns(0, 3)).toBe(false);
    expect(fitsAllColumns(-1, 3)).toBe(false);
    expect(fitsAllColumns(Number.NaN, 3)).toBe(false);
  });

  it('has nothing to fit when no columns are configured', () => {
    expect(fitsAllColumns(0, 0)).toBe(true);
  });
});

describe('fittedColumnWidth', () => {
  it('splits the available width evenly between the columns', () => {
    expect(fittedColumnWidth(1200, 4)).toBe(300);
    expect(fittedColumnWidth(1200, 5)).toBe(240);
    expect(fittedColumnWidth(1176, 5)).toBe(235);
  });

  it('caps a sparse board so two columns do not become very wide lists', () => {
    expect(fittedColumnWidth(1200, 2)).toBe(MAX_COLUMN_WIDTH_PX);
  });

  it('never returns a fraction of a pixel', () => {
    expect(Number.isInteger(fittedColumnWidth(1000, 3))).toBe(true);
  });
});
