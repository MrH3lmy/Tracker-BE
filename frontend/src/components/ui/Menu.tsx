import { DropdownMenu as RadixDropdownMenu } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

export function Menu({ children, ...rest }: ComponentProps<typeof RadixDropdownMenu.Root>) {
  return <RadixDropdownMenu.Root {...rest}>{children}</RadixDropdownMenu.Root>;
}

export function MenuTrigger(props: ComponentProps<typeof RadixDropdownMenu.Trigger>) {
  return <RadixDropdownMenu.Trigger {...props} />;
}

export interface MenuContentProps extends ComponentProps<typeof RadixDropdownMenu.Content> {
  children: ReactNode;
}

export function MenuContent({ children, className, sideOffset = 6, align = 'end', ...rest }: MenuContentProps) {
  return (
    <RadixDropdownMenu.Portal>
      <RadixDropdownMenu.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(
          'z-(--z-dropdown) min-w-44 overflow-hidden rounded-lg border border-line bg-raised p-1 shadow-md',
          className,
        )}
        {...rest}
      >
        {children}
      </RadixDropdownMenu.Content>
    </RadixDropdownMenu.Portal>
  );
}

export interface MenuItemProps extends ComponentProps<typeof RadixDropdownMenu.Item> {
  destructive?: boolean;
}

export function MenuItem({ destructive = false, className, ...rest }: MenuItemProps) {
  return (
    <RadixDropdownMenu.Item
      className={cn(
        'flex w-full cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50',
        destructive
          ? 'text-critical data-highlighted:bg-critical-soft'
          : 'text-fg data-highlighted:bg-inset',
        className,
      )}
      {...rest}
    />
  );
}

export function MenuSeparator({ className, ...rest }: ComponentProps<typeof RadixDropdownMenu.Separator>) {
  return <RadixDropdownMenu.Separator className={cn('my-1 h-px bg-line', className)} {...rest} />;
}

export function MenuLabel({ className, ...rest }: ComponentProps<typeof RadixDropdownMenu.Label>) {
  return (
    <RadixDropdownMenu.Label
      className={cn('px-2.5 py-1.5 text-xs font-medium text-fg-subtle', className)}
      {...rest}
    />
  );
}
