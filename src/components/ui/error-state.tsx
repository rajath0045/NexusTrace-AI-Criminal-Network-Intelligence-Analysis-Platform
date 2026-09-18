interface ErrorStateProps {
  title?: string;
  description?: string;
}

export function ErrorState({
  title = "Unable to load this view",
  description = "Try again. If the problem persists, contact an administrator.",
}: ErrorStateProps) {
  return (
    <section className="state-panel state-panel--error" role="alert">
      <span className="state-code" aria-hidden="true">
        !!
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
