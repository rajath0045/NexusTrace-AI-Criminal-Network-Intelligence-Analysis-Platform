"use client";

interface WorkspaceToolbarProps {
  editable: boolean;
  pending: boolean;
  dirty: boolean;
  error: string | null;
  onCustomize: () => void;
  onSave: () => void;
  onReset: () => void;
}

export function WorkspaceToolbar({
  editable,
  pending,
  dirty,
  error,
  onCustomize,
  onSave,
  onReset,
}: WorkspaceToolbarProps) {
  return (
    <section className="workspace-toolbar" aria-label="Workspace layout controls">
      <div>
        <span className="workspace-toolbar-state">
          {editable ? "Customize mode" : "Fixed layout"}
        </span>
        <p>
          {editable
            ? "Drag widgets or change their size, then save the layout."
            : "Your saved arrangement is locked for normal investigation work."}
        </p>
        {error ? (
          <p className="workspace-toolbar-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="workspace-toolbar-actions">
        {editable ? (
          <>
            <button
              className="secondary-button"
              type="button"
              onClick={onReset}
              disabled={pending}
            >
              Reset page layout
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={onSave}
              disabled={pending}
            >
              {pending
                ? "Saving…"
                : dirty
                  ? "Done / Save layout"
                  : "Done"}
            </button>
          </>
        ) : (
          <button
            className="secondary-button"
            type="button"
            onClick={onCustomize}
          >
            Customize layout
          </button>
        )}
      </div>
    </section>
  );
}
