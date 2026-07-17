import { useMemo, useRef, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { HabitCard } from '../components/habits/HabitCard';
import { HabitCreateForm, type HabitCreateFormHandle } from '../components/habits/HabitCreateForm';
import type { CreateHabitPayload, HabitRecord } from '../components/habits/habitTypes';
import { useHabitMutations, useHabitsQuery } from '../hooks/useApiQueries';
import { Button, Drawer, PageHeader } from '../components/ui';
import { Plus } from '../components/ui/icons';

export function HabitsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitRecord | undefined>(undefined);
  const createFormRef = useRef<HabitCreateFormHandle>(null);

  const habitsQuery = useHabitsQuery();
  const { createHabit, updateHabit, deleteHabit, checkIn, undoCheckIn } = useHabitMutations();
  const busy = createHabit.isPending || updateHabit.isPending || deleteHabit.isPending || checkIn.isPending || undoCheckIn.isPending;

  const habits = useMemo<HabitRecord[]>(() => {
    const data = habitsQuery.data?.data;
    return Array.isArray(data) ? (data as HabitRecord[]) : [];
  }, [habitsQuery.data]);

  const showCreatePanel = () => {
    setEditingHabit(undefined);
    setCreateOpen(true);
    window.requestAnimationFrame(() => createFormRef.current?.focusTitle());
  };

  const showEditPanel = (habit: HabitRecord) => {
    setEditingHabit(habit);
    setCreateOpen(true);
    window.requestAnimationFrame(() => createFormRef.current?.focusTitle());
  };

  const closeCreatePanel = () => {
    setCreateOpen(false);
    setEditingHabit(undefined);
  };

  const submit = (payload: CreateHabitPayload, onSuccess: () => void) => {
    if (editingHabit) {
      updateHabit.mutate({ id: editingHabit.id, body: payload }, { onSuccess: (result) => { if (result.ok) { onSuccess(); closeCreatePanel(); } } });
    } else {
      createHabit.mutate(payload, { onSuccess: (result) => { if (result.ok) onSuccess(); } });
    }
  };

  const isLoading = habitsQuery.isLoading;
  const hasError = isQueryError(habitsQuery.data);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Habits"
        description="Recurring personal routines, tracked by daily check-ins and streaks - separate from work tasks."
        actions={
          <Button variant="primary" onClick={showCreatePanel} disabled={busy}>
            <Plus className="h-4 w-4" aria-hidden />
            Add habit
          </Button>
        }
        className="mb-0"
      />

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && habits.length === 0}
        emptyMessage="No habits yet. Add one to start tracking a daily routine."
      />

      {habits.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              busy={busy}
              onCheckIn={(id) => checkIn.mutate(id)}
              onUndoCheckIn={(id) => undoCheckIn.mutate(id)}
              onEdit={showEditPanel}
              onDelete={(id) => deleteHabit.mutate(id)}
            />
          ))}
        </div>
      )}

      <Drawer
        open={createOpen}
        onOpenChange={(open) => { if (!open) closeCreatePanel(); }}
        title={editingHabit ? 'Edit habit' : 'Create habit'}
        description="Habits repeat and are tracked separately from your work tasks."
        wide
      >
        <HabitCreateForm
          ref={createFormRef}
          busy={busy}
          isSubmitting={createHabit.isPending || updateHabit.isPending}
          mode={editingHabit ? 'edit' : 'create'}
          initialValue={editingHabit}
          onCancel={closeCreatePanel}
          onSubmit={submit}
          onInvalidTitle={() => setCreateOpen(true)}
        />
      </Drawer>
    </div>
  );
}
