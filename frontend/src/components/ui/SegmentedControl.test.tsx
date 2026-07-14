import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl responsiveness', () => {
  it('gives every option an equal-width, shrinkable flex item so a narrow filter panel does not clip the last option', () => {
    const options = [
      { value: 'sticky', label: 'Sticky board' },
      { value: 'list', label: 'List' },
      { value: 'table', label: 'Table' },
      { value: 'timeline', label: 'Timeline' },
    ] as const;

    render(<SegmentedControl value="list" onValueChange={vi.fn()} options={options} aria-label="Note view modes" className="w-full" />);

    const tablist = screen.getByRole('tablist', { name: 'Note view modes' });
    expect(tablist.className).not.toContain('inline-flex');
    expect(tablist.className).toContain('min-w-0');

    for (const name of ['Sticky board', 'List', 'Table', 'Timeline']) {
      const tab = screen.getByRole('tab', { name });
      expect(tab.className).toContain('min-w-0');
      expect(tab.className).toContain('flex-1');
      expect(tab).toBeVisible();
    }
  });
});
