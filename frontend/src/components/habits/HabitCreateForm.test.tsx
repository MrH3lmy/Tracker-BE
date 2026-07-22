import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HabitCreateForm, type HabitCreateFormHandle } from './HabitCreateForm';
import type { HabitPreset } from './habitTypes';

function renderForm(onSubmit = vi.fn()) {
  const ref = createRef<HabitCreateFormHandle>();
  render(
    <HabitCreateForm
      ref={ref}
      busy={false}
      onSubmit={onSubmit}
      onValidityChange={vi.fn()}
    />,
  );
  return { ref, onSubmit };
}

const durationPreset: HabitPreset = {
  label: 'Deep work',
  icon: '🎯',
  title: 'Deep work',
  description: 'Complete one distraction-free focus session',
  area: 'WORK',
  goalType: 'DURATION',
  estimatedMinutes: 60,
};

const countPreset: HabitPreset = {
  label: 'Gratitude',
  icon: '🙏',
  title: 'Gratitude',
  description: 'Write down 3 things you are grateful for',
  area: 'PERSONAL',
  dailyTargetCount: 3,
  goalType: 'COUNT',
  unit: 'items',
};

const completeOncePreset: HabitPreset = {
  label: 'Call family',
  icon: '📞',
  title: 'Call family',
  description: 'Call or check in with a family member',
  area: 'FAMILY',
  goalType: 'COMPLETE_ONCE',
};

describe('HabitCreateForm.applyPreset', () => {
  it('populates the duration input for a DURATION preset', () => {
    const { ref } = renderForm();

    act(() => ref.current?.applyPreset(durationPreset));

    expect(screen.getByLabelText('Habit name')).toHaveValue('Deep work');
    expect(screen.getByLabelText('Category')).toHaveValue('WORK');
    expect(screen.getByLabelText('Goal type')).toHaveValue('DURATION');
    expect(screen.getByLabelText('Duration (minutes)')).toHaveValue(60);
  });

  it('submits estimatedMinutes and no dailyTargetCount override after a duration preset', () => {
    const { ref, onSubmit } = renderForm();

    act(() => ref.current?.applyPreset(durationPreset));
    act(() => ref.current?.submit());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [payload] = onSubmit.mock.calls[0];
    expect(payload.estimatedMinutes).toBe(60);
    expect(payload.dailyTargetCount).toBe(1);
  });

  it('populates target and unit for a COUNT preset', () => {
    const { ref } = renderForm();

    act(() => ref.current?.applyPreset(countPreset));

    expect(screen.getByLabelText('Goal type')).toHaveValue('COUNT');
    expect(screen.getByLabelText('Target')).toHaveValue(3);
    expect(screen.getByLabelText('Target unit')).toHaveValue('items');
  });

  it('submits dailyTargetCount from a COUNT preset', () => {
    const { ref, onSubmit } = renderForm();

    act(() => ref.current?.applyPreset(countPreset));
    act(() => ref.current?.submit());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [payload] = onSubmit.mock.calls[0];
    expect(payload.dailyTargetCount).toBe(3);
    expect(payload.estimatedMinutes).toBeUndefined();
  });

  it('defaults a COMPLETE_ONCE preset to a daily target of 1', () => {
    const { ref, onSubmit } = renderForm();

    act(() => ref.current?.applyPreset(completeOncePreset));

    expect(screen.getByLabelText('Goal type')).toHaveValue('COMPLETE_ONCE');
    expect(screen.queryByLabelText('Target')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Duration (minutes)')).not.toBeInTheDocument();

    act(() => ref.current?.submit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [payload] = onSubmit.mock.calls[0];
    expect(payload.dailyTargetCount).toBe(1);
    expect(payload.estimatedMinutes).toBeUndefined();
  });

  it('still applies an existing preset (Drink water) correctly', () => {
    const { ref } = renderForm();

    act(() => ref.current?.applyPreset({
      label: 'Drink water',
      icon: '💧',
      title: 'Drink water',
      description: '8 glasses of water',
      area: 'HEALTH',
      dailyTargetCount: 8,
      goalType: 'COUNT',
      unit: 'glasses',
    }));

    expect(screen.getByLabelText('Habit name')).toHaveValue('Drink water');
    expect(screen.getByLabelText('Target')).toHaveValue(8);
    expect(screen.getByLabelText('Target unit')).toHaveValue('glasses');
  });
});
