import * as RadixPopover from '@radix-ui/react-popover';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

export function Popover(props: ComponentProps<typeof RadixPopover.Root>) {
  return <RadixPopover.Root {...props} />;
}

export function PopoverTrigger(props: ComponentProps<typeof RadixPopover.Trigger>) {
  return <RadixPopover.Trigger {...props} />;
}

export function PopoverAnchor(props: ComponentProps<typeof RadixPopover.Anchor>) {
  return <RadixPopover.Anchor {...props} />;
}

export interface PopoverContentProps extends ComponentProps<typeof RadixPopover.Content> {
  children: ReactNode;
}

export function PopoverContent({ children, className, sideOffset = 8, align = 'end', ...rest }: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={8}
        className={cn(
          'z-(--z-dropdown) w-80 rounded-lg border border-line bg-raised p-4 shadow-md outline-none',
          className,
        )}
        {...rest}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}
