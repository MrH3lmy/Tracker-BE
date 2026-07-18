import { createContext, useContext } from 'react';

export type UserTier = 'FREE' | 'PREMIUM';
export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: number | string;
  email: string;
  displayName?: string | null;
  tier: UserTier;
  role: UserRole;
}

export interface AuthActionResult {
  ok: boolean;
  errorMessage?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string, displayName?: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

const notReady = async (): Promise<AuthActionResult> => ({ ok: false, errorMessage: 'Authentication is not ready yet.' });

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: notReady,
  register: notReady,
  logout: async () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}
