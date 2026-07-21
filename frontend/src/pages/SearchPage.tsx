import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useSearchQuery, type SearchFilters, type SearchResultRecord } from '../hooks/useApiQueries';
import { parseSearchQuery } from '../lib/searchQueryParser';
import { formatEnumLabel } from '../lib/enumLabels';
import { Badge, Button, Card, Input, PageHeader } from '../components/ui';
import { Flame, ListTodo, StickyNote, Tag as TagIcon } from '../components/ui/icons';

const PAGE_SIZE = 20;

const TYPE_ICONS: Record<SearchResultRecord['type'], typeof ListTodo> = {
  TASK: ListTodo,
  NOTE: StickyNote,
  HABIT: Flame,
  TAG: TagIcon,
};

const FILTER_HELP = 'Narrow results with type:task, type:note, type:habit, type:tag, status:blocked, due:this-week, area:work, or tag:decision.';

function ResultRow({ result }: { result: SearchResultRecord }) {
  const navigate = useNavigate();
  const Icon = TYPE_ICONS[result.type];

  return (
    <button
      type="button"
      onClick={() => navigate(result.url)}
      className="flex w-full items-start gap-3 rounded-lg border border-line bg-card p-3.5 text-left shadow-2xs transition-colors duration-(--duration-fast) hover:border-line-strong hover:bg-inset/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg">{result.title}</span>
          <Badge variant="outline">{formatEnumLabel(result.type)}</Badge>
        </div>
        {result.snippet && <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{result.snippet}</p>}
      </div>
    </button>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rawQuery, setRawQuery] = useState(() => searchParams.get('q') ?? '');
  const [page, setPage] = useState(0);

  const parsed = useMemo(() => parseSearchQuery(rawQuery), [rawQuery]);
  const filters = useMemo<SearchFilters>(() => ({
    q: parsed.freeText,
    type: (parsed.type as SearchFilters['type']) ?? '',
    status: parsed.status,
    due: parsed.due,
    area: parsed.area,
    tag: parsed.tag,
    page,
    size: PAGE_SIZE,
  }), [parsed, page]);

  const hasAnyCriteria = Boolean(parsed.freeText || parsed.type || parsed.status || parsed.due || parsed.area || parsed.tag);
  const query = useSearchQuery(filters, hasAnyCriteria);
  const results = query.data?.data?.items ?? [];
  const totalElements = query.data?.data?.totalElements ?? 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < totalElements;

  const submitQuery = (value: string) => {
    setRawQuery(value);
    setPage(0);
    setSearchParams(value ? { q: value } : {}, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Search" description="Find tasks, notes, habits, and tags across your workspace." className="mb-0" />

      <Card>
        <label className="sr-only" htmlFor="global-search-input">Search</label>
        <Input
          id="global-search-input"
          value={rawQuery}
          onChange={(event) => submitQuery(event.target.value)}
          placeholder="Search everything... try type:task status:blocked"
          autoFocus
        />
        <p className="mt-2 text-xs text-fg-subtle">{FILTER_HELP}</p>
      </Card>

      {!hasAnyCriteria ? (
        <p className="text-sm text-fg-muted" role="status">Start typing to search across your tasks, notes, habits, and tags.</p>
      ) : (
        <>
          <QueryState
            isLoading={query.isLoading || query.isFetching}
            isError={isQueryError(query.data)}
            isEmpty={!query.isLoading && results.length === 0}
            emptyMessage="No results match this search."
          />
          {results.length > 0 && (
            <>
              <p className="text-sm text-fg-muted">{totalElements} result{totalElements === 1 ? '' : 's'}</p>
              <div className="flex flex-col gap-2">
                {results.map((result) => <ResultRow key={`${result.type}-${result.id}`} result={result} />)}
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button size="sm" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Previous</Button>
                <span className="text-xs text-fg-subtle">Page {page + 1}</span>
                <Button size="sm" onClick={() => setPage((current) => current + 1)} disabled={!hasNextPage}>Next</Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
