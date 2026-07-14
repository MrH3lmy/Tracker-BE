import { Badge } from "../ui";

export interface ActiveFilterChip {
  key: string;
  label: string;
  onClear: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
}

export function ActiveFilterChips({ chips }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Active note filters">
      {chips.map((chip) => (
        <Badge key={chip.key} variant="outline" className="gap-1.5 py-1">
          {chip.label}
          <button
            type="button"
            className="text-fg-subtle hover:text-critical"
            onClick={chip.onClear}
            aria-label={`Clear filter: ${chip.label}`}
          >
            ×
          </button>
        </Badge>
      ))}
    </div>
  );
}
