interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
      <p className="text-sm text-fg-muted">Scaffolded page.</p>
    </div>
  );
}
