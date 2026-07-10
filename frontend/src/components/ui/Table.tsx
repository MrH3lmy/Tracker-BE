import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from './cn';

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className={cn('w-full border-collapse text-sm', className)} {...rest} />
    </div>
  );
}

export function TableHead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-inset/60', className)} {...rest} />;
}

export function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...rest} />;
}

export function TableRow({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-line transition-colors last:border-0 hover:bg-inset/40', className)} {...rest} />;
}

export function TableHeaderCell({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-3.5 py-2.5 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-fg-muted uppercase', className)}
      {...rest}
    />
  );
}

export function TableCell({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-3.5 py-2.5 align-middle text-fg', className)} {...rest} />;
}
