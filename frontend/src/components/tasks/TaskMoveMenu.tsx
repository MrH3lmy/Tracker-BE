import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '../ui';
import { ArrowRight, Check, MoveHorizontal } from '../ui/icons';
import type { BoardColumnRecord } from '../board/boardTypes';

export interface TaskMoveMenuProps {
  taskTitle: string;
  columns: BoardColumnRecord[];
  currentColumnId?: number;
  onMove: (columnId: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * The single-pointer, keyboard-operable way to move a task between board columns.
 *
 * `dragging-alternative` (WCAG 2.2 AA, 2.5.7): "a single-pointer alternative for
 * author-controlled drag operations -- add buttons, menus or tap-to-move controls
 * and retain keyboard operation. Don't make dragging the only way to reorder."
 *
 * The previous board wired a KeyboardSensor, so a keyboard user could move a task,
 * but on a touchscreen dragging was the *only* way -- a conformance gap, not a
 * polish item. So movement is modelled here as a command rather than a gesture:
 * this menu is the mechanism on every surface, and drag is layered on top as an
 * accelerator for people who prefer it.
 *
 * Each destination names the column explicitly, so the control is meaningful to a
 * screen reader without any spatial context.
 */
export function TaskMoveMenu({
  taskTitle,
  columns,
  currentColumnId,
  onMove,
  disabled = false,
  size = 'sm',
}: TaskMoveMenuProps) {
  if (columns.length === 0) return null;

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          iconOnly
          disabled={disabled}
          aria-label={`Move "${taskTitle}" to another column`}
          title="Move to column"
        >
          <MoveHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </MenuTrigger>
      <MenuContent align="start" className="min-w-52">
        <MenuLabel>Move to column</MenuLabel>
        <MenuSeparator />
        {columns.map((column) => {
          const isCurrent = column.id === currentColumnId;
          return (
            <MenuItem
              key={column.id}
              disabled={isCurrent}
              onSelect={() => onMove(column.id)}
              // The current column is named too, so the menu also answers
              // "where is this task now?" without a separate affordance.
              aria-current={isCurrent ? 'true' : undefined}
            >
              {isCurrent ? (
                <Check className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              ) : (
                <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">{column.name}</span>
              {isCurrent && <span className="text-xs text-fg-subtle">Current</span>}
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
}
