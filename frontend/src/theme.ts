export const THEME_SETTING_KEY = 'ui.theme';
export const THEME_STORAGE_KEY = 'tracker.theme';

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Bright, neutral workspace.' },
  { value: 'dark', label: 'Dark', description: 'Low-glare palette for dim environments.' },
  { value: 'neon', label: 'Neon', description: 'Dark with electric-blue glow.' },
] as const;

export type AppTheme = (typeof THEME_OPTIONS)[number]['value'];

export const DEFAULT_THEME: AppTheme = 'light';

// Retired theme values map onto the nearest surviving palette so stored
// preferences (localStorage and the backend `ui.theme` setting) keep working.
const LEGACY_THEME_MAP: Record<string, AppTheme> = {
  light: 'light',
  compact: 'light',
  'high-contrast': 'light',
  ocean: 'light',
  sunset: 'light',
  forest: 'light',
  dark: 'dark',
  midnight: 'dark',
  neon: 'neon',
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
