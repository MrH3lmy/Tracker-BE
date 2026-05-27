interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  successMessage?: string;
}

export function QueryState({ isLoading, isError, isEmpty, errorMessage = 'Request failed.', emptyMessage = 'No data available.', successMessage }: QueryStateProps) {
  if (isLoading) return <p role="status" aria-live="polite">Loading...</p>;
  if (isError) return <p className="error" role="status" aria-live="assertive">{errorMessage}</p>;
  if (isEmpty) return <p role="status" aria-live="polite">{emptyMessage}</p>;
  if (successMessage) return <p className="success" role="status" aria-live="polite">{successMessage}</p>;
  return null;
}
