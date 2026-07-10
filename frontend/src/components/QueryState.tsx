interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  successMessage?: string;
}

export function QueryState({ isLoading, isError, isEmpty, errorMessage = 'Request failed.', emptyMessage = 'No data available.', successMessage }: QueryStateProps) {
  if (isLoading) return <p className="text-sm text-fg-muted" role="status" aria-live="polite">Loading...</p>;
  if (isError) return <p className="text-sm font-medium text-critical" role="status" aria-live="assertive">{errorMessage}</p>;
  if (isEmpty) return <p className="text-sm text-fg-muted" role="status" aria-live="polite">{emptyMessage}</p>;
  if (successMessage) return <p className="text-sm font-medium text-positive" role="status" aria-live="polite">{successMessage}</p>;
  return null;
}
