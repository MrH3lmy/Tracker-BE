import { afterEach, describe, expect, it } from 'vitest';
import { readRecentItems, recordRecentItem } from './recentItems';

afterEach(() => {
  localStorage.clear();
});

describe('recentItems', () => {
  it('returns an empty list when nothing has been recorded', () => {
    expect(readRecentItems()).toEqual([]);
  });

  it('records an item and reads it back with a viewedAt timestamp', () => {
    recordRecentItem({ type: 'TASK', id: 1, title: 'Ship release', url: '/tasks/1' });

    const items = readRecentItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'TASK', id: 1, title: 'Ship release', url: '/tasks/1' });
    expect(items[0].viewedAt).toEqual(expect.any(Number));
  });

  it('puts the most recently recorded item first', () => {
    recordRecentItem({ type: 'TASK', id: 1, title: 'First', url: '/tasks/1' });
    recordRecentItem({ type: 'NOTE', id: 2, title: 'Second', url: '/notes' });

    expect(readRecentItems().map((item) => item.title)).toEqual(['Second', 'First']);
  });

  it('de-duplicates by type and id, moving a re-visited item back to the front', () => {
    recordRecentItem({ type: 'TASK', id: 1, title: 'First', url: '/tasks/1' });
    recordRecentItem({ type: 'NOTE', id: 2, title: 'Second', url: '/notes' });
    recordRecentItem({ type: 'TASK', id: 1, title: 'First (renamed)', url: '/tasks/1' });

    const items = readRecentItems();
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ type: 'TASK', id: 1, title: 'First (renamed)' });
  });

  it('caps the list at 8 items, dropping the oldest', () => {
    for (let i = 0; i < 10; i += 1) {
      recordRecentItem({ type: 'TASK', id: i, title: `Task ${i}`, url: `/tasks/${i}` });
    }

    const items = readRecentItems();
    expect(items).toHaveLength(8);
    expect(items[0]).toMatchObject({ id: 9 });
    expect(items.some((item) => item.id === 0)).toBe(false);
  });

  it('ignores malformed data already sitting in localStorage', () => {
    localStorage.setItem('tracker.search.recentItems', JSON.stringify([{ garbage: true }, 'not-an-item']));
    expect(readRecentItems()).toEqual([]);
  });
});
