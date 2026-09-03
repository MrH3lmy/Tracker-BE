import type { ComponentType } from 'react';
import { cn } from '../ui';
import { AlertTriangle, Bell, CheckCircle2, Clock, Flag, ListTodo } from '../ui/icons';
import {
  TASK_LENS_LABEL,
  TASK_LENS_VALUES,
  TASK_SIGNAL_LABEL,
  TASK_SIGNAL_VALUES,
  type TaskLens,
  type TaskLensCounts,
  type TaskSignal,
  type TaskSignalCounts,
} from './taskLenses';

type ChipIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

const LENS_ICON: Record<TaskLens, ChipIcon> = {
  all: ListTodo,
  ready: CheckCircle2,
  blocked: AlertTriangle,
  waiting: Clock,
};

const SIGNAL_ICON: Record<TaskSignal, ChipIcon> = {
  overdue: Bell,
  followUp: Clock,
  important: Flag,
};

/** Accent applied only when the chip is pressed - never the sole carrier of meaning (icon + word always present). */
const LENS_ACTIVE: Record<TaskLens, string> = {
  all: 'border-fg-subtle bg-neutral-soft text-fg',
  ready: 'border-positive bg-positive-soft text-positive',
  blocked: 'border-caution bg-caution-soft text-caution',
  waiting: 'border-line-strong bg-inset text-fg',
};

const SIGNAL_ACTIVE: Record<TaskSignal, string> = {
  overdue: 'border-critical bg-critical-soft text-critical',
  followUp: 'border-brand bg-brand-soft text-brand',
  important: 'border-caution bg-caution-soft text-caution',
};

const chipBase =
  'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-default disabled:opacity-50';

const chipIdle = 'border-line bg-card text-fg-muted hover:bg-inset hover:text-fg';

interface StateChipButtonProps {
  icon: ChipIcon;
  label: string;
  count: number;
  pressed: boolean;
  activeClassName: string;
  accessibleName: string;
  onClick: () => void;
  disabled?: boolean;
}

function StateChipButton({ icon: Icon, label, count, pressed, activeClassName, accessibleName, onClick, disabled }: StateChipButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={accessibleName}
      onClick={onClick}
      disabled={disabled}
      className={cn(chipBase, pressed ? activeClassName : chipIdle)}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
      <span className="font-mono text-xs tabular-nums opacity-80">{count}</span>
    </button>
  );
}

export interface TaskWorkspaceRailProps {
  scopeLabel: string;
  lens: TaskLens;
  onLensChange: (lens: TaskLens) => void;
  lensCounts: TaskLensCounts;
  signals: TaskSignal[];
  onToggleSignal: (signal: TaskSignal) => void;
  signalCounts: TaskSignalCounts;
  disabled?: boolean;
}

/**
 * Two deliberately separate axes (design-system/tracker-be/pages/tasks-workspace.md §3):
 * **work state** is mutually exclusive because ready/blocked/waiting partition the scope exactly,
 * **signals** are independent toggles that compose with it. Merging them into one row would imply
 * they are alternatives.
 *
 * Every chip is a real `<button aria-pressed>` per the skill's `ux` "Compact Control Semantics"
 * (Critical) rule, and every count is taken over the whole current scope - never a filtered slice.
 */
export function TaskWorkspaceRail({ scopeLabel, lens, onLensChange, lensCounts, signals, onToggleSignal, signalCounts, disabled = false }: TaskWorkspaceRailProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Work state - counts across all ${scopeLabel} tasks`}>
        {TASK_LENS_VALUES.map((value) => (
          <StateChipButton
            key={value}
            icon={LENS_ICON[value]}
            label={TASK_LENS_LABEL[value]}
            count={lensCounts[value]}
            pressed={lens === value}
            activeClassName={LENS_ACTIVE[value]}
            accessibleName={`${TASK_LENS_LABEL[value]}, ${lensCounts[value]} ${scopeLabel} task${lensCounts[value] === 1 ? '' : 's'}`}
            onClick={() => onLensChange(value)}
            disabled={disabled}
          />
        ))}
      </div>
      <div className="hidden h-6 w-px shrink-0 bg-line sm:block" aria-hidden />
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Attention signals - counts across all ${scopeLabel} tasks`}>
        {TASK_SIGNAL_VALUES.map((value) => (
          <StateChipButton
            key={value}
            icon={SIGNAL_ICON[value]}
            label={TASK_SIGNAL_LABEL[value]}
            count={signalCounts[value]}
            pressed={signals.includes(value)}
            activeClassName={SIGNAL_ACTIVE[value]}
            accessibleName={`${TASK_SIGNAL_LABEL[value]}, ${signalCounts[value]} ${scopeLabel} task${signalCounts[value] === 1 ? '' : 's'}`}
            onClick={() => onToggleSignal(value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
