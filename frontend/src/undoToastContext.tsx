import { createContext, useContext } from 'react';

export interface UndoToastContextValue {
  /** Shows a bottom toast with an Undo action. Auto-dismisses after a few seconds. */
  showUndo: (message: string, onUndo: () => void) => void;
}

export const UndoToastContext = createContext<UndoToastContextValue | null>(null);

export function useUndoToast(): UndoToastContextValue {
  const context = useContext(UndoToastContext);
  if (!context) throw new Error('useUndoToast must be used within an UndoToastContext.Provider');
  return context;
}
