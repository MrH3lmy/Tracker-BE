interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return <div><h2>{title}</h2><p>Scaffolded page.</p></div>;
}
