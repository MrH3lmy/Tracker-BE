import { useEffect, useRef, useState } from 'react';
import type { HabitRecord } from '../components/habits/habitTypes';

const CHECK_INTERVAL_MS = 20_000;

const currentHHMM = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const todayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function useHabitReminders(habits: HabitRecord[]) {
  const [dueHabits, setDueHabits] = useState<HabitRecord[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    const hasReminders = habits.some((habit) => habit.reminderEnabled && habit.reminderTime);
    if (hasReminders) Notification.requestPermission().catch(() => {});
  }, [habits]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = currentHHMM(now);
      const dateKey = todayKey(now);

      for (const habit of habits) {
        if (!habit.reminderEnabled || !habit.reminderTime) continue;
        if (habit.reminderTime.slice(0, 5) > currentTime) continue;

        const targetMet = habit.todayTargetMet ?? (habit.todayCheckInCount ?? 0) >= (habit.dailyTargetCount ?? 1);
        if (targetMet) continue;

        const fireKey = `${habit.id}-${dateKey}`;
        if (firedRef.current.has(fireKey)) continue;
        firedRef.current.add(fireKey);

        setDueHabits((prev) => (prev.some((due) => due.id === habit.id) ? prev : [...prev, habit]));

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`Habit reminder: ${habit.title}`, {
            body: habit.description || 'Time to check in.',
            tag: fireKey,
          });
        }
      }
    };

    checkReminders();
    const interval = window.setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [habits]);

  const dismiss = (habitId: number) => setDueHabits((prev) => prev.filter((habit) => habit.id !== habitId));

  return { dueHabits, dismiss };
}
