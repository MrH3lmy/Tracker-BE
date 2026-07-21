import { useMemo, useRef, useState } from 'react';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { HabitCard } from '../components/habits/HabitCard';
import { HabitCreateForm, type HabitCreateFormHandle } from '../components/habits/HabitCreateForm';
import { HabitDeleteDialog } from '../components/habits/HabitDeleteDialog';
import { HabitTemplateSelector } from '../components/habits/HabitTemplateSelector';
import { WeeklyOverviewTable } from '../components/habits/WeeklyOverviewTable';
import { buildHistoryMap, getWeekDates, toDateKey, HABIT_CATEGORY_LABELS } from '../components/habits/habitPresentation';
import { HABIT_CATEGORY_VALUES, HABIT_SORT_LABELS, HABIT_SORT_VALUES, type CreateHabitPayload, type HabitCategory, type HabitPreset, type HabitRecord, type HabitSortValue } from '../components/habits/habitTypes';
import { useHabitHistoryQuery, useHabitMutations, useHabitsQuery } from '../hooks/useApiQueries';
import { Button, Card, Drawer, PageHeader, Select, cn } from '../components/ui';
import { Plus, Sparkles } from '../components/ui/icons';

type CategoryFilter = 'ALL' | HabitCategory;

const CATEGORY_FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  ...HABIT_CATEGORY_VALUES.map((value) => ({ value, label: HABIT_CATEGORY_LABELS[value] })),
];

const todayHeaderLabel = () => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

const habitCreatedTime = (habit: HabitRecord) => {
  const time = habit.createdDate ? new Date(habit.createdDate).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
};

const reminderSortValue = (habit: HabitRecord) => (habit.reminderEnabled && habit.reminderTime ? habit.reminderTime : '99:99');

const sortHabits = (habits: HabitRecord[], sort: HabitSortValue): HabitRecord[] => [...habits].sort((a, b) => {
  if (sort === 'name') return a.title.localeCompare(b.title);
  if (sort === 'currentStreak') return (b.recurrence?.currentStreak ?? 0) - (a.recurrence?.currentStreak ?? 0) || a.title.localeCompare(b.title);
  if (sort === 'recentlyCreated') return habitCreatedTime(b) - habitCreatedTime(a);
  return reminderSortValue(a).localeCompare(reminderSortValue(b)) || a.title.localeCompare(b.title);
});

export function HabitsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitRecord | undefined>(undefined);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string | undefined>(undefined);
  const [formValid, setFormValid] = useState(true);
  const [habitPendingDelete, setHabitPendingDelete] = useState<HabitRecord | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [sort, setSort] = useState<HabitSortValue>('reminderTime');
  const createFormRef = useRef<HabitCreateFormHandle>(null);
  const templateSectionRef = useRef<HTMLDivElement>(null);

  const habitsQuery = useHabitsQuery();
  const { createHabit, updateHabit, deleteHabit, checkIn, undoCheckIn } = useHabitMutations();
  const busy = createHabit.isPending || updateHabit.isPending || deleteHabit.isPending || checkIn.isPending || undoCheckIn.isPending;
  const isSubmitting = createHabit.isPending || updateHabit.isPending;

  const weekDates = useMemo(() => getWeekDates(), []);
  const weekFrom = toDateKey(weekDates[0]);
  const weekTo = toDateKey(weekDates[6]);
  const historyQuery = useHabitHistoryQuery(weekFrom, weekTo);
  const historyEntries = useMemo(() => (Array.isArray(historyQuery.data?.data) ? historyQuery.data.data : []), [historyQuery.data]);
  const historyByHabit = useMemo(() => buildHistoryMap(historyEntries), [historyEntries]);

  const habits = useMemo<HabitRecord[]>(() => {
    const data = habitsQuery.data?.data;
    return Array.isArray(data) ? (data as HabitRecord[]) : [];
  }, [habitsQuery.data]);

  const visibleHabits = useMemo(() => {
    const filtered = categoryFilter === 'ALL' ? habits : habits.filter((habit) => habit.area === categoryFilter);
    return sortHabits(filtered, sort);
  }, [habits, categoryFilter, sort]);

  const stats = useMemo(() => {
    const completedToday = habits.filter((habit) => habit.todayTargetMet ?? (habit.todayCheckInCount ?? 0) >= (habit.dailyTargetCount ?? 1)).length;
    const currentStreak = habits.reduce((max, habit) => Math.max(max, habit.recurrence?.currentStreak ?? 0), 0);
    const bestStreak = habits.reduce((max, habit) => Math.max(max, habit.recurrence?.longestStreak ?? 0), 0);
    const percent = habits.length === 0 ? 0 : Math.round((completedToday / habits.length) * 100);
    return { total: habits.length, completedToday, currentStreak, bestStreak, percent };
  }, [habits]);

  const showCreatePanel = (initialFocus: 'title' | 'templates' = 'title') => {
    setEditingHabit(undefined);
    setSelectedPresetLabel(undefined);
    setFormValid(false);
    setCreateOpen(true);
    window.requestAnimationFrame(() => {
      if (initialFocus === 'templates') templateSectionRef.current?.focus();
      else createFormRef.current?.focusTitle();
    });
  };

  const showEditPanel = (habit: HabitRecord) => {
    setEditingHabit(habit);
    setSelectedPresetLabel(undefined);
    setFormValid(true);
    setCreateOpen(true);
    window.requestAnimationFrame(() => createFormRef.current?.focusTitle());
  };

  const closeCreatePanel = () => {
    setCreateOpen(false);
    setEditingHabit(undefined);
    setSelectedPresetLabel(undefined);
  };

  const applyPreset = (preset: HabitPreset) => {
    setSelectedPresetLabel(preset.label);
    createFormRef.current?.applyPreset(preset);
  };

  const submit = (payload: CreateHabitPayload, onSuccess: () => void) => {
    if (editingHabit) {
      updateHabit.mutate({ id: editingHabit.id, body: payload }, { onSuccess: (result) => { if (result.ok) { onSuccess(); closeCreatePanel(); } } });
    } else {
      createHabit.mutate(payload, { onSuccess: (result) => { if (result.ok) onSuccess(); } });
    }
  };

  const confirmDelete = (id: number) => {
    deleteHabit.mutate(id, { onSuccess: (result) => { if (result.ok) setHabitPendingDelete(undefined); } });
  };

  const isLoading = habitsQuery.isLoading;
  const hasError = isQueryError(habitsQuery.data);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Habits"
        description={<span className="inline-flex items-center gap-1.5"><span aria-hidden>📅</span> {todayHeaderLabel()}</span>}
        actions={
          <>
            <Button onClick={() => showCreatePanel('templates')} disabled={busy}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Browse templates
            </Button>
            <Button variant="primary" onClick={() => showCreatePanel('title')} disabled={busy}>
              <Plus className="h-4 w-4" aria-hidden />
              New habit
            </Button>
          </>
        }
        className="mb-0"
      />

      {habits.length > 0 && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg">Today's progress</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-fg">{stats.completedToday}</span>
              <span className="text-sm text-fg-muted">of {stats.total} completed</span>
              <span className="ml-auto text-sm font-medium text-fg-muted sm:ml-2">{stats.percent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-inset" role="progressbar" aria-valuenow={stats.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Today's overall progress">
              <div className="h-full rounded-full bg-brand transition-[width] duration-(--duration-base)" style={{ width: `${stats.percent}%` }} />
            </div>
          </div>
          <div className="flex gap-4 sm:border-l sm:border-line sm:pl-4">
            <div className="text-center">
              <p className="text-lg font-bold text-caution">🔥 {stats.currentStreak}</p>
              <p className="text-xs text-fg-muted">Current streak</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-fg">👑 {stats.bestStreak}</p>
              <p className="text-xs text-fg-muted">Best streak</p>
            </div>
          </div>
        </Card>
      )}

      {habits.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter habits by category">
            {CATEGORY_FILTER_OPTIONS.map((option) => {
              const selected = option.value === categoryFilter;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategoryFilter(option.value)}
                  className={cn(
                    'min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast)',
                    selected ? 'bg-brand text-brand-fg' : 'bg-inset text-fg-muted hover:text-fg',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm text-fg-muted">
            Sort
            <Select aria-label="Sort habits" value={sort} onChange={(e) => setSort(e.target.value as HabitSortValue)} className="w-44">
              {HABIT_SORT_VALUES.map((value) => <option key={value} value={value}>{HABIT_SORT_LABELS[value]}</option>)}
            </Select>
          </label>
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isError={hasError}
        isEmpty={!isLoading && !hasError && habits.length === 0}
        emptyMessage="No habits yet. Add one to start tracking a daily routine."
      />

      {!isLoading && !hasError && habits.length > 0 && visibleHabits.length === 0 && (
        <p className="text-sm text-fg-muted" role="status">No habits match this filter.</p>
      )}

      {visibleHabits.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              busy={busy}
              weekHistory={historyByHabit.get(habit.id)}
              onCheckIn={(id) => checkIn.mutate(id)}
              onUndoCheckIn={(id) => undoCheckIn.mutate(id)}
              onEdit={showEditPanel}
              onDeleteRequest={setHabitPendingDelete}
            />
          ))}
        </div>
      )}

      {visibleHabits.length > 0 && (
        <WeeklyOverviewTable habits={visibleHabits} historyEntries={historyEntries} isLoading={historyQuery.isLoading} />
      )}

      <Drawer
        open={createOpen}
        onOpenChange={(open) => { if (!open) closeCreatePanel(); }}
        title="Create habit"
        description="Set a routine you want to repeat."
        wide
        topSlot={!editingHabit ? (
          <div ref={templateSectionRef} tabIndex={-1} className="outline-none">
            <HabitTemplateSelector selectedLabel={selectedPresetLabel} onSelect={applyPreset} disabled={busy} />
          </div>
        ) : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={closeCreatePanel} disabled={busy}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => createFormRef.current?.submit()}
              disabled={busy || !formValid}
            >
              {editingHabit ? (isSubmitting ? 'Saving…' : 'Save changes') : (isSubmitting ? 'Creating…' : 'Create habit')}
            </Button>
          </>
        }
      >
        <HabitCreateForm
          ref={createFormRef}
          busy={busy}
          initialValue={editingHabit}
          onSubmit={submit}
          onValidityChange={setFormValid}
        />
      </Drawer>

      <HabitDeleteDialog
        habit={habitPendingDelete}
        busy={deleteHabit.isPending}
        onCancel={() => setHabitPendingDelete(undefined)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
