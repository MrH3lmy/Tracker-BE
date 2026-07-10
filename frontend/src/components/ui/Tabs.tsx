import * as RadixTabs from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';
import { cn } from './cn';

export function Tabs(props: ComponentProps<typeof RadixTabs.Root>) {
  return <RadixTabs.Root {...props} />;
}

export function TabsList({ className, ...rest }: ComponentProps<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn('inline-flex items-center gap-1 rounded-lg bg-inset p-1', className)}
      {...rest}
    />
  );
}

export function TabsTrigger({ className, ...rest }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg data-[state=active]:bg-card data-[state=active]:text-fg data-[state=active]:shadow-xs',
        className,
      )}
      {...rest}
    />
  );
}

export function TabsContent({ className, ...rest }: ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn('outline-none', className)} {...rest} />;
}
