"use client";

import { type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";

export interface ProfileTabDefinition {
  id: string;
  label: string;
  content: ReactNode;
}

export function ProfileTabs({ tabs }: { tabs: ProfileTabDefinition[] }) {
  const instanceId = useId();
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeId));
  const activeTab = tabs[activeIndex];

  function selectAt(index: number) {
    if (tabs.length === 0) return;
    const wrappedIndex = (index + tabs.length) % tabs.length;
    const nextTab = tabs[wrappedIndex];
    if (!nextTab) return;
    setActiveId(nextTab.id);
    tabRefs.current[wrappedIndex]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAt(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAt(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAt(tabs.length - 1);
    }
  }

  if (!activeTab) return null;

  return (
    <section className="profile-sections">
      <div className="profile-tab-scroll">
        <div className="profile-tabs" role="tablist" aria-label="Person profile sections">
          {tabs.map((tab, index) => {
            const selected = tab.id === activeTab.id;
            return (
              <button
                aria-controls={`${instanceId}-${tab.id}-panel`}
                aria-selected={selected}
                id={`${instanceId}-${tab.id}-tab`}
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                onKeyDown={(event) => onKeyDown(event, index)}
                ref={(node) => { tabRefs.current[index] = node; }}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        aria-labelledby={`${instanceId}-${activeTab.id}-tab`}
        className="profile-tab-panel"
        id={`${instanceId}-${activeTab.id}-panel`}
        role="tabpanel"
      >
        {activeTab.content}
      </div>
    </section>
  );
}
