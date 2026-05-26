interface StatusBadgeProps {
  status?: number;
  ok?: boolean;
}

export function StatusBadge({ status, ok }: StatusBadgeProps) {
  if (status === undefined) {
    return <span className="status-badge idle">No response</span>;
  }

  const bucket = status === 0 ? "error" : ok ? "success" : status >= 500 ? "error" : "warning";

  return <span className={`status-badge ${bucket}`}>{status === 0 ? "Network" : status}</span>;
}
