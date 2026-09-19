"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TimelineItem } from "@/domain/incident";

const filters = ["ALL", "INCIDENT", "EVIDENCE", "CASE", "RELATIONSHIP", "COMMUNICATION", "FINANCIAL", "LOCATION"] as const;

export function TimelineList({ items, title = "Timeline" }: { items: TimelineItem[]; title?: string }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const visible = useMemo(() => items.filter((item) => filter === "ALL" || item.type === filter), [filter, items]);
  return <section className="timeline-panel">
    <div className="panel-heading"><div><p className="panel-kicker">Authorized chronology</p><h2>{title}</h2></div><div className="timeline-filter" role="group" aria-label="Timeline filters">{filters.filter((option) => option === "ALL" || items.some((item) => item.type === option)).map((option) => <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)}>{option === "ALL" ? "All" : option.toLowerCase()}</button>)}</div></div>
    {visible.length === 0 ? <EmptyState title="No timeline activity" description="No authorized records match this timeline scope and filter." /> : <ol className="timeline-list">{visible.map((item) => <li key={item.id}><time dateTime={item.timestamp.toISOString()}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(item.timestamp)}</time><div><strong>{item.title}</strong><p>{item.description}</p><span>{item.sourceRecordType} · <Link href={item.sourceRecordType === "INCIDENT" ? `/incidents/${item.sourceRecordId}` : item.sourceRecordType === "CASE" ? `/cases/${item.sourceRecordId}` : item.sourceRecordType === "EVIDENCE" ? `/api/evidence/${item.sourceRecordId}` : item.sourceRecordType === "RELATIONSHIP" || item.sourceRecordType === "LOCATION_OBSERVATION" ? "/network" : "/investigations"}>Open source</Link></span></div><StatusBadge>{item.type}</StatusBadge></li>)}</ol>}
  </section>;
}
