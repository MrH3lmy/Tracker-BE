import { Collapsible as RadixCollapsible } from 'radix-ui';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

export interface CollapsibleProps {
  title: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
}

export function Collapsible({ title, badge, children, open, onOpenChange, defaultOpen, className }: CollapsibleProps) {
  return (
    <RadixCollapsible.Root
      open={open}
      onOpenChange={onOpenChange}
      defaultOpen={defaultOpen}
      className={cn('rounded-lg border border-line', className)}
    >
      <RadixCollapsible.Trigger className="group flex w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-sm font-medium text-fg hover:bg-inset data-[state=open]:rounded-b-none">
        <span className="flex min-w-0 items-center gap-2">
          {title}
          {badge}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-fg-muted transition-transform duration-(--duration-fast) group-data-[state=open]:rotate-180"
          aria-hidden
        />
      </RadixCollapsible.Trigger>
      <RadixCollapsible.Content className="border-t border-line px-4 py-4">{children}</RadixCollapsible.Content>
    </RadixCollapsible.Root>
  );
}
