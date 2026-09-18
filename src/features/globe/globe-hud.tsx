"use client";

import React from "react";
import { IntelligenceNode } from "./types";

interface GlobeHudProps {
  totalNodes: number;
  totalConnections: number;
  hoveredNode: IntelligenceNode | null;
  selectedNode: IntelligenceNode | null;
  isAutoRotating: boolean;
  onToggleRotation: () => void;
  onResetView: () => void;
}

export function GlobeHud({
  totalNodes,
  totalConnections,
  hoveredNode,
  selectedNode,
  isAutoRotating,
  onToggleRotation,
  onResetView,
}: GlobeHudProps) {
  const activeNode = selectedNode || hoveredNode;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* Top Subtle Telemetry Pill & Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-[var(--border)]/50 bg-[#080b10]/60 px-2.5 py-1 text-[0.68rem] backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60"></span>
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]"></span>
          </span>
          <span className="font-mono tracking-wider text-[var(--text-muted)] uppercase">
            Global Network
          </span>
          <span className="text-[var(--border)]">•</span>
          <span className="font-mono text-[var(--text-muted)]">
            {totalNodes} Nodes • {totalConnections} Connections
          </span>
        </div>

        {/* Minimal Controls */}
        <div className="pointer-events-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleRotation}
            className="flex items-center gap-1 rounded border border-[var(--border)]/50 bg-[#080b10]/60 px-2 py-0.5 font-mono text-[0.64rem] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--text)] focus-visible:outline-none"
            aria-label={isAutoRotating ? "Pause rotation" : "Resume rotation"}
          >
            <span
              className={`inline-block h-1 w-1 rounded-full ${
                isAutoRotating ? "bg-[var(--accent)]" : "bg-[var(--warning)]"
              }`}
            />
            {isAutoRotating ? "ROTATING" : "PAUSED"}
          </button>
          <button
            type="button"
            onClick={onResetView}
            className="rounded border border-[var(--border)]/50 bg-[#080b10]/60 px-2 py-0.5 font-mono text-[0.64rem] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--text)] focus-visible:outline-none"
            aria-label="Reset globe orientation"
          >
            RESET
          </button>
        </div>
      </div>

      {/* Bottom Compact Node Inspector Tooltip */}
      {activeNode && (
        <div
          className="pointer-events-auto max-w-xs rounded-md border border-[var(--border-strong)]/80 bg-[#080d14]/90 p-3 shadow-lg backdrop-blur-md transition-all animate-in fade-in duration-150"
          role="dialog"
          aria-label={`Entity Inspector: ${activeNode.classification}`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]" />
              <span className="font-mono text-[0.65rem] font-bold tracking-wider text-[var(--accent)] uppercase">
                {activeNode.classification}
              </span>
            </div>
            <span className="font-mono text-[0.62rem] text-[var(--text-muted)] uppercase">
              {activeNode.status}
            </span>
          </div>
          <p className="mt-1.5 text-[0.72rem] leading-relaxed text-[var(--text)]">
            {activeNode.details}
          </p>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--border)]/40 pt-1 font-mono text-[0.6rem] text-[var(--text-muted)]">
            <span>CONFIDENCE: {(activeNode.confidenceScore * 100).toFixed(0)}%</span>
            <span className="text-[var(--accent)]">MONITORED LINK</span>
          </div>
        </div>
      )}
    </div>
  );
}
