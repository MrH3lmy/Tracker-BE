export const THEME_SETTING_KEY = 'ui.theme';
export const THEME_STORAGE_KEY = 'tracker.theme';

/**
 * Every theme is the same neutral chrome carrying a different accent hue --
 * the accent marks action and state, it does not tint the workspace. See
 * design-system/tracker-v2/MASTER.md ("Chrome is neutral").
 */
export const THEME_OPTIONS = [
  { value: 'light', label: 'Daylight', description: 'Neutral light workspace with a blue action accent.' },
  { value: 'dark', label: 'Midnight', description: 'Neutral dark workspace with a blue action accent.' },
  { value: 'aurora', label: 'Aurora', description: 'Neutral dark workspace with a violet action accent.' },
  { value: 'ocean', label: 'Ocean', description: 'Neutral light workspace with a deep-cyan action accent.' },
  { value: 'forest', label: 'Forest', description: 'Neutral light workspace with a green action accent.' },
] as const;

export type AppTheme = (typeof THEME_OPTIONS)[number]['value'];

export const DEFAULT_THEME: AppTheme = 'light';

// Retired theme values map onto the nearest surviving palette so stored
// preferences (localStorage and the backend `ui.theme` setting) keep working.
// Every current AppTheme value also needs an identity entry here, since
// normalizeTheme() looks values up in this map directly (no isAppTheme
// fast path) — ocean/forest used to be retired aliases pointing at
// 'light'; they're now real themes in their own right.
const LEGACY_THEME_MAP: Record<string, AppTheme> = {
  light: 'light',
  compact: 'light',
  'high-contrast': 'light',
  sunset: 'light',
  dark: 'dark',
  midnight: 'dark',
  neon: 'aurora',
  aurora: 'aurora',
  ocean: 'ocean',
  forest: 'forest',
};

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && THEME_OPTIONS.some((option) => option.value === value);
}

export function normalizeTheme(value: unknown): AppTheme | null {
  if (typeof value !== 'string') return null;
  return LEGACY_THEME_MAP[value] ?? null;
}

export function readThemeFromSettings(settings: unknown): AppTheme | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  return normalizeTheme((settings as Record<string, unknown>)[THEME_SETTING_KEY]);
}

export function readStoredTheme(): AppTheme | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  const normalized = normalizeTheme(raw);
  if (normalized && normalized !== raw) {
    // Self-heal stored legacy values (e.g. "midnight" -> "dark").
    persistStoredTheme(normalized);
  }
  return normalized;
}

export function persistStoredTheme(theme: AppTheme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyDocumentTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}
