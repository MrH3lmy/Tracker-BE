import { createContext, useContext } from 'react';

export interface AnnouncementContextValue {
  message: string;
  announce: (message: string) => void;
}

export const AnnouncementContext = createContext<AnnouncementContextValue | null>(null);

export function useAnnouncement() {
  const context = useContext(AnnouncementContext);
  if (!context) throw new Error('useAnnouncement must be used within an AnnouncementContext.Provider');
  return context;
}
