import { Button, Dialog } from '../ui';
import type { HabitRecord } from './habitTypes';

interface HabitDeleteDialogProps {
  habit: HabitRecord | undefined;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (id: number) => void;
}

export function HabitDeleteDialog({ habit, busy, onCancel, onConfirm }: HabitDeleteDialogProps) {
  return (
    <Dialog
      open={Boolean(habit)}
      onOpenChange={(open) => { if (!open) onCancel(); }}
      title="Delete habit?"
      description={habit ? `"${habit.title}" and its check-in history will be permanently deleted. This can't be undone.` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={() => habit && onConfirm(habit.id)} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete habit'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">This removes all tracked progress for this habit.</p>
    </Dialog>
  );
}
