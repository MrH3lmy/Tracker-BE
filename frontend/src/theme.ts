export const THEME_SETTING_KEY = 'ui.theme';
export const THEME_STORAGE_KEY = 'tracker.theme';

export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Bright default workspace with spacious controls.' },
  { value: 'dark', label: 'Dark', description: 'Lower-light palette for reduced glare.' },
  { value: 'high-contrast', label: 'High contrast', description: 'Maximum contrast colors and stronger outlines.' },
  { value: 'compact', label: 'Compact', description: 'Light palette with tighter spacing and smaller radii.' },
  { value: 'ocean', label: 'Ocean', description: 'Cool coastal blues and teals for a calm planning workspace.' },
  { value: 'sunset', label: 'Sunset', description: 'Warm peach, coral, and violet tones for a focused end-of-day feel.' },
  { value: 'forest', label: 'Forest', description: 'Grounded greens and moss accents for a natural low-glare workspace.' },
  { value: 'midnight', label: 'Midnight', description: 'Deep navy surfaces with electric blue highlights for late-night work.' },
] as const;

export type AppTheme = (typeof THEME_OPTIONS)[number]['value'];

export const DEFAULT_THEME: AppTheme = 'light';

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === 'string' && THEME_OPTIONS.some((option) => option.value === value);
}

export function readThemeFromSettings(settings: unknown): AppTheme | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const value = (settings as Record<string, unknown>)[THEME_SETTING_KEY];
  return isAppTheme(value) ? value : null;
}

export function readStoredTheme(): AppTheme | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isAppTheme(value) ? value : null;
}

export function persistStoredTheme(theme: AppTheme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyDocumentTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}
