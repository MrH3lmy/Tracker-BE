import { useEffect, useRef, useState } from 'react';
import type { HabitRecord } from '../components/habits/habitTypes';
import { DEFAULT_HABIT_REMINDER_STYLE, type HabitReminderStyle } from '../validation/settings';

const CHECK_INTERVAL_MS = 20_000;
const PERSISTENT_REPEAT_MS = 15 * 60_000;

const currentHHMM = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const todayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function useHabitReminders(habits: HabitRecord[], style: HabitReminderStyle = DEFAULT_HABIT_REMINDER_STYLE) {
  const [dueHabits, setDueHabits] = useState<HabitRecord[]>([]);
  const firedRef = useRef<Set<string>>(new Set());
  const lastNotifiedAtRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (style === 'silent' || style === 'gentle') return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    const hasReminders = habits.some((habit) => habit.reminderEnabled && habit.reminderTime);
    if (hasReminders) Notification.requestPermission().catch(() => {});
  }, [habits, style]);

  useEffect(() => {
    const checkReminders = () => {
      if (style === 'silent') {
        setDueHabits((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      const now = new Date();
      const currentTime = currentHHMM(now);
      const dateKey = todayKey(now);

      for (const habit of habits) {
        if (!habit.reminderEnabled || !habit.reminderTime) continue;
        if (habit.reminderTime.slice(0, 5) > currentTime) continue;

        const targetMet = habit.todayTargetMet ?? (habit.todayCheckInCount ?? 0) >= (habit.dailyTargetCount ?? 1);
        if (targetMet) continue;

        if (style === 'persistent') {
          // Re-nag on a fixed cadence instead of a once-a-day dedup key, until checked in.
          const lastNotifiedAt = lastNotifiedAtRef.current.get(habit.id);
          if (lastNotifiedAt !== undefined && now.getTime() - lastNotifiedAt < PERSISTENT_REPEAT_MS) continue;
          lastNotifiedAtRef.current.set(habit.id, now.getTime());
        } else {
          const fireKey = `${habit.id}-${dateKey}`;
          if (firedRef.current.has(fireKey)) continue;
          firedRef.current.add(fireKey);
        }

        setDueHabits((prev) => (prev.some((due) => due.id === habit.id) ? prev : [...prev, habit]));

        if (style !== 'gentle' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`Habit reminder: ${habit.title}`, {
            body: habit.description || 'Time to check in.',
            tag: `${habit.id}-${dateKey}`,
          });
        }
      }
    };

    checkReminders();
    const interval = window.setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [habits, style]);

  const dismiss = (habitId: number) => setDueHabits((prev) => prev.filter((habit) => habit.id !== habitId));

  return { dueHabits, dismiss };
}
