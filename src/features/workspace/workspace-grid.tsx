"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import DraggableWidgetGrid, {
  type WidgetSize,
} from "@/components/ui/draggable-widget-grid";
import type {
  WorkspaceKey,
  WorkspaceLayoutItem,
} from "@/domain/workspace";
import {
  resetWorkspaceLayoutAction,
  saveWorkspaceLayoutAction,
} from "./workspace-actions";
import { WorkspaceToolbar } from "./workspace-toolbar";

export interface WorkspaceWidgetSlot {
  id: string;
  content: ReactNode;
}

interface WorkspaceGridProps {
  workspaceKey: WorkspaceKey;
  initialItems: WorkspaceLayoutItem[];
  widgets: WorkspaceWidgetSlot[];
  ariaLabel: string;
  maxColumns?: number;
  cellSize?: number;
}

const sizeOptions: ReadonlyArray<{ value: WidgetSize; label: string }> = [
  { value: "sm", label: "Small" },
  { value: "wide", label: "Wide" },
  { value: "tall", label: "Tall" },
  { value: "lg", label: "Large" },
];

function readableError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The layout could not be saved. Your previous layout is unchanged.";
}

export function WorkspaceGrid({
  workspaceKey,
  initialItems,
  widgets,
  ariaLabel,
  maxColumns = 4,
  cellSize = 260,
}: WorkspaceGridProps) {
  const [items, setItems] = useState(initialItems);
  const [editable, setEditable] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const contentById = useMemo(
    () => new Map(widgets.map((widget) => [widget.id, widget.content])),
    [widgets],
  );

  const updateSize = (id: string, size: WidgetSize) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, size } : item)),
    );
    setDirty(true);
    setRevision((current) => current + 1);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const saved = await saveWorkspaceLayoutAction({ workspaceKey, items });
        setItems(saved.items);
        setEditable(false);
        setDirty(false);
        setRevision((current) => current + 1);
      } catch (saveError) {
        setError(readableError(saveError));
      }
    });
  };

  const reset = () => {
    setError(null);
    startTransition(async () => {
      try {
        const defaults = await resetWorkspaceLayoutAction(workspaceKey);
        setItems(defaults.items);
        setEditable(false);
        setDirty(false);
        setRevision((current) => current + 1);
      } catch (resetError) {
        setError(readableError(resetError));
      }
    });
  };

  return (
    <section className="customizable-workspace" aria-label={ariaLabel}>
      <WorkspaceToolbar
        editable={editable}
        pending={pending}
        dirty={dirty}
        error={error}
        onCustomize={() => {
          setEditable(true);
          setError(null);
        }}
        onSave={save}
        onReset={reset}
      />

      <DraggableWidgetGrid
        key={`${workspaceKey}-${revision}`}
        items={items}
        editable={editable}
        maxColumns={maxColumns}
        cellSize={cellSize}
        gap={16}
        radius={10}
        className="nexustrace-widget-grid"
        onChange={(nextItems) => {
          setItems(nextItems as WorkspaceLayoutItem[]);
          setDirty(true);
        }}
        renderItem={(item) => (
          <article className="workspace-widget">
            {editable ? (
              <div
                className="workspace-widget-size-controls"
                role="group"
                aria-label={`Size for ${item.label}`}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <span>Size</span>
                {sizeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={item.size === option.value}
                    onClick={() => updateSize(item.id, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="workspace-widget-content">
              {contentById.get(item.id)}
            </div>
          </article>
        )}
      />
    </section>
  );
}
