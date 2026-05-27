interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorMessage?: string;
  emptyMessage?: string;
}

export function QueryState({ isLoading, isError, isEmpty, errorMessage = 'Request failed.', emptyMessage = 'No data available.' }: QueryStateProps) {
  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p className="error">{errorMessage}</p>;
  if (isEmpty) return <p>{emptyMessage}</p>;
  return null;
}
