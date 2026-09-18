interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="state-panel" aria-labelledby="empty-state-title">
      <span className="state-code" aria-hidden="true">
        00
      </span>
      <h2 id="empty-state-title">{title}</h2>
      <p>{description}</p>
    </section>
  );
}
