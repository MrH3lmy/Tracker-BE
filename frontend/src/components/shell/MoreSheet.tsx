import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '../ui';
import { X } from '../ui/icons';
import { Button } from '../ui';
import { useReturnFocus } from '../ui/useReturnFocus';
import { NavGroups } from './NavList';
import { AccountMenu } from './AccountMenu';
import type { NavGroup } from './navigation';
import type { AuthUser } from '../../authContext';

export interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: NavGroup[];
  user: AuthUser | null;
  onLogout: () => void;
}

/**
 * The one place below `lg` that lists every destination, replacing the inline
 * nav panel that used to duplicate the sidebar under the header.
 *
 * `persistent-nav`: core navigation stays reachable from any depth.
 * `modal-escape`: Radix gives Escape, an overlay click, and this explicit close
 * button.
 */
export function MoreSheet({ open, onOpenChange, groups, user, onLogout }: MoreSheetProps) {
  const returnFocus = useReturnFocus();

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-scrim md:hidden" />
        <RadixDialog.Content
          id="shell-more-sheet"
          aria-modal="true"
          onOpenAutoFocus={returnFocus.onOpenAutoFocus}
          onCloseAutoFocus={returnFocus.onCloseAutoFocus}
          className={cn(
            'fixed inset-y-0 left-0 z-(--z-overlay) flex w-[min(20rem,88vw)] flex-col',
            'border-r border-line bg-card md:hidden',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <RadixDialog.Title className="text-sm font-semibold text-fg">Navigate</RadixDialog.Title>
            <RadixDialog.Description className="sr-only">
              All Tracker destinations and account actions
            </RadixDialog.Description>
            <RadixDialog.Close asChild>
              <Button variant="ghost" size="sm" iconOnly aria-label="Close navigation menu">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </RadixDialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <NavGroups groups={groups} density="full" onNavigate={() => onOpenChange(false)} />
          </div>

          {user && (
            <div className="border-t border-line px-2 py-2">
              <AccountMenu user={user} onLogout={onLogout} />
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
