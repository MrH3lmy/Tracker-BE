import { useNavigate } from 'react-router-dom';
import { Badge, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '../ui';
import { ChevronDown, LogOut, Settings, User } from '../ui/icons';
import type { AuthUser } from '../../authContext';

export interface AccountMenuProps {
  user: AuthUser;
  onLogout: () => void;
  /** Rail/tab-bar variants drop the name and show the avatar alone. */
  compact?: boolean;
}

/**
 * `destructive-nav-separation`: log out is a destructive action and must be
 * spatially separated from ordinary navigation. The previous shell rendered it
 * as a bare button sitting inline between the notification bell and the user's
 * name, one stray click away from normal chrome. It now lives behind an explicit
 * account menu, below a separator, styled as destructive.
 */
export function AccountMenu({ user, onLogout, compact = false }: AccountMenuProps) {
  const navigate = useNavigate();
  const name = user.displayName || user.email;
  const initial = (name.trim()[0] ?? '?').toUpperCase();

  return (
    <Menu>
      <MenuTrigger
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-(--duration-fast) hover:bg-inset"
        aria-label={`Account menu for ${name}`}
      >
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
        >
          {initial}
        </span>
        {!compact && (
          <span className="hidden min-w-0 flex-1 flex-col sm:flex">
            <span className="truncate text-[13px] font-medium text-fg">{name}</span>
            {user.tier === 'PREMIUM' && <span className="truncate text-[11px] text-fg-subtle">Premium</span>}
          </span>
        )}
        <ChevronDown className="hidden h-4 w-4 shrink-0 text-fg-subtle sm:block" aria-hidden />
      </MenuTrigger>
      <MenuContent className="min-w-56">
        <MenuLabel>
          <span className="block truncate font-normal text-fg">{name}</span>
          <span className="block truncate text-fg-subtle">{user.email}</span>
        </MenuLabel>
        {user.tier === 'PREMIUM' && (
          <div className="px-2.5 pb-1.5">
            <Badge variant="brand">Premium</Badge>
          </div>
        )}
        <MenuSeparator />
        <MenuItem onSelect={() => navigate('/settings')}>
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          Settings
        </MenuItem>
        <MenuItem onSelect={() => navigate('/settings')}>
          <User className="h-4 w-4 shrink-0" aria-hidden />
          Profile and appearance
        </MenuItem>
        <MenuSeparator />
        <MenuItem destructive onSelect={onLogout}>
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          Log out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
