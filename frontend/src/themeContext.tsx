import { createContext, useContext } from 'react';
import type { AppTheme } from './theme';
import { DEFAULT_THEME } from './theme';

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => undefined,
});

export const useTheme = () => useContext(ThemeContext);
