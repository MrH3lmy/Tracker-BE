interface JsonBlockProps {
  value: unknown;
  emptyLabel?: string;
}

export function JsonBlock({ value, emptyLabel = "No JSON" }: JsonBlockProps) {
  if (value === undefined || value === null) {
    return <pre className="json-block muted">{emptyLabel}</pre>;
  }

  return <pre className="json-block">{JSON.stringify(value, null, 2)}</pre>;
}
