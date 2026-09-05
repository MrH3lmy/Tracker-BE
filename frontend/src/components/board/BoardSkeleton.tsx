import { cn } from '../ui';

/**
 * Title-line counts per placeholder card. Varying them makes the skeleton read
 * as a board of real cards rather than a grid of identical blocks.
 */
const COLUMN_SHAPES = [
  [2, 1, 2],
  [1, 2],
  [2, 1, 1, 2],
  [1],
];

/**
 * The board's loading state.
 *
 * `loading-indicators`: "stable skeleton or progress with aria-busy" -- bad:
 * "flickering spinner or frozen UI". `content-jumping`: "reserve appropriate
 * space... don't insert compact text or media without a layout strategy".
 *
 * The previous board rendered a bare "Loading..." line, so the entire board
 * popped into place when the query resolved. This reserves the column grid at the
 * shape the real board will occupy.
 */
export function BoardSkeleton({ columnCount = 4 }: { columnCount?: number }) {
  return (
    <div className="flex min-h-0 flex-1 gap-0 overflow-hidden" aria-hidden>
      {Array.from({ length: columnCount }, (_, columnIndex) => (
        <div
          key={columnIndex}
          className={cn(
            'flex w-full shrink-0 flex-col md:w-[17.5rem]',
            'md:border-l md:border-line md:first:border-l-0',
            // Below `md` only the first column is on screen, matching the real board.
            columnIndex > 0 && 'hidden md:flex',
          )}
        >
          <div className="flex flex-col gap-1 px-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-3.5 flex-1 animate-pulse rounded bg-inset" />
              <div className="h-3.5 w-5 animate-pulse rounded bg-inset" />
            </div>
            <div className="min-h-4" />
            <div className="h-0.5 w-full rounded-full bg-line-strong" />
          </div>
          <div className="flex flex-col gap-2 px-3 pt-2">
            {COLUMN_SHAPES[columnIndex % COLUMN_SHAPES.length].map((titleLines, cardIndex) => (
              // Mirrors the real card: spine, title lines, then a meta row, so the
              // shapes the content will occupy are already reserved.
              <div
                key={cardIndex}
                className="relative flex animate-pulse flex-col gap-1.5 overflow-hidden rounded-lg border border-line bg-card py-2 pr-1.5 pl-3"
              >
                <span className="absolute inset-y-0 left-0 w-[3px] bg-line" />
                <div className="h-3 w-full rounded bg-inset" />
                {titleLines > 1 && <div className="h-3 w-3/5 rounded bg-inset" />}
                <div className="flex items-center justify-between gap-2">
                  <div className="h-2.5 w-20 rounded bg-inset" />
                  <div className="h-2.5 w-7 rounded bg-inset" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
