interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading investigation data" }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-indicator" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
