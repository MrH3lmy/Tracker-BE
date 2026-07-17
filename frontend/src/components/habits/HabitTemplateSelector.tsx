import { HABIT_PRESETS, type HabitPreset } from './habitTypes';
import { cn } from '../ui';

interface HabitTemplateSelectorProps {
  selectedLabel?: string;
  onSelect: (preset: HabitPreset) => void;
  disabled?: boolean;
}

export function HabitTemplateSelector({ selectedLabel, onSelect, disabled = false }: HabitTemplateSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-fg-muted">Start from a template</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Habit templates">
        {HABIT_PRESETS.map((preset) => {
          const selected = preset.label === selectedLabel;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(preset)}
              disabled={disabled}
              className={cn(
                'flex min-w-20 flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-center transition-colors duration-(--duration-fast) disabled:opacity-50',
                selected ? 'border-brand bg-brand-soft shadow-2xs' : 'border-line bg-card hover:border-brand/50',
              )}
            >
              <span className="text-lg" aria-hidden>{preset.icon}</span>
              <span className={cn('text-xs font-medium', selected ? 'text-brand' : 'text-fg-muted')}>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
