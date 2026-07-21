import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isQueryError } from '../apiClient';
import { QueryState } from '../components/QueryState';
import { useSearchQuery, type SearchFilters, type SearchResultRecord } from '../hooks/useApiQueries';
import { useRovingSelection } from '../hooks/useRovingSelection';
import { parseSearchQuery } from '../lib/searchQueryParser';
import { formatEnumLabel } from '../lib/enumLabels';
import { readRecentItems, recordRecentItem, type RecentItem } from '../lib/recentItems';
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

function ResultRow({ result, active, onSelect, onHover }: { result: SearchResultRecord; active: boolean; onSelect: () => void; onHover: () => void }) {
  const Icon = TYPE_ICONS[result.type];

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left shadow-2xs transition-colors duration-(--duration-fast) hover:border-line-strong hover:bg-inset/40 ${active ? 'border-line-strong bg-inset/40' : 'border-line bg-card'}`}
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

function RecentItemRow({ item, onSelect }: { item: RecentItem; onSelect: () => void }) {
  const Icon = TYPE_ICONS[item.type];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg border border-line bg-card p-3 text-left shadow-2xs transition-colors duration-(--duration-fast) hover:border-line-strong hover:bg-inset/40"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{item.title}</span>
      <Badge variant="outline">{formatEnumLabel(item.type)}</Badge>
    </button>
  );
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rawQuery, setRawQuery] = useState(() => searchParams.get('q') ?? '');
  const [page, setPage] = useState(0);
  const [recentItems, setRecentItems] = useState<RecentItem[]>(() => readRecentItems());

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
  const results = useMemo(() => query.data?.data?.items ?? [], [query.data]);
  const totalElements = query.data?.data?.totalElements ?? 0;
  const hasNextPage = (page + 1) * PAGE_SIZE < totalElements;

  const goToResult = (result: SearchResultRecord) => {
    recordRecentItem({ type: result.type, id: result.id, title: result.title, url: result.url });
    navigate(result.url);
  };

  const { activeIndex, setActiveIndex, onKeyDown } = useRovingSelection(results, (result) => `${result.type}-${result.id}`, goToResult);

  useEffect(() => {
    // Refresh from localStorage whenever the query is cleared back to the empty state, so an item just visited elsewhere shows up.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads an external store (localStorage) on entering the empty state, not deriving render state.
    if (!hasAnyCriteria) setRecentItems(readRecentItems());
  }, [hasAnyCriteria]);

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
          onKeyDown={onKeyDown}
          placeholder="Search everything... try type:task status:blocked"
          autoFocus
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="search-results-listbox"
        />
        <p className="mt-2 text-xs text-fg-subtle">{FILTER_HELP}</p>
      </Card>

      {!hasAnyCriteria ? (
        recentItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-fg-muted">Recent</p>
            {recentItems.map((item) => (
              <RecentItemRow key={`${item.type}-${item.id}`} item={item} onSelect={() => goToResult(item)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted" role="status">Start typing to search across your tasks, notes, habits, and tags.</p>
        )
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
              <div id="search-results-listbox" role="listbox" aria-label="Search results" className="flex flex-col gap-2">
                {results.map((result, index) => (
                  <ResultRow
                    key={`${result.type}-${result.id}`}
                    result={result}
                    active={index === activeIndex}
                    onSelect={() => goToResult(result)}
                    onHover={() => setActiveIndex(index)}
                  />
                ))}
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
