import { createContext, useContext } from 'react';

export interface QuickCaptureContextValue {
  /** Opens the global quick-capture modal (header button, Ctrl+K/Cmd+K, mobile Quick add). */
  openQuickCapture: (initialDate?: string) => void;
}

export const QuickCaptureContext = createContext<QuickCaptureContextValue | null>(null);

export function useQuickCapture(): QuickCaptureContextValue {
  const context = useContext(QuickCaptureContext);
  if (!context) throw new Error('useQuickCapture must be used within a QuickCaptureContext.Provider');
  return context;
}
