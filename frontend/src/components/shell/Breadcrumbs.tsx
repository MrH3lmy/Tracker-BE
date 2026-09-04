import { Link } from 'react-router-dom';
import { ChevronRight } from '../ui/icons';
import type { Crumb } from './navigation';

/**
 * `breadcrumb-web`: orientation for routes three or more levels deep. The
 * trailing crumb is the current page, so it is plain text carrying
 * `aria-current="page"` rather than a link to itself.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />}
              {crumb.path && !isLast ? (
                <Link
                  to={crumb.path}
                  className="truncate rounded-xs text-sm text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="truncate text-sm font-semibold text-fg"
                  title={crumb.label}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
