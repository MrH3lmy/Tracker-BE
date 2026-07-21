import type { SearchResultRecord } from '../hooks/useApiQueries';

const RECENT_ITEMS_KEY = 'tracker.search.recentItems';
const MAX_RECENT_ITEMS = 8;

export interface RecentItem {
  type: SearchResultRecord['type'];
  id: number;
  title: string;
  url: string;
  viewedAt: number;
}

const isRecentItem = (value: unknown): value is RecentItem => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.type === 'string' && typeof candidate.id === 'number' && typeof candidate.title === 'string'
    && typeof candidate.url === 'string' && typeof candidate.viewedAt === 'number';
};

export function readRecentItems(): RecentItem[] {
  try {
    const raw = localStorage.getItem(RECENT_ITEMS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecentItem) : [];
  } catch {
    return [];
  }
}

export function recordRecentItem(item: Pick<RecentItem, 'type' | 'id' | 'title' | 'url'>): void {
  try {
    const withoutDuplicate = readRecentItems().filter((entry) => !(entry.type === item.type && entry.id === item.id));
    const next = [{ ...item, viewedAt: Date.now() }, ...withoutDuplicate].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, quota) -- recent items is a nice-to-have, fail silently.
  }
}
