import type { CaseDetail } from "@/domain/case";
import { StatusBadge } from "@/components/ui/status-badge";

export function CaseOverview({ record }: { record: CaseDetail }) {
  const date = record.occurredAt
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(record.occurredAt)
    : "Not recorded";
  return (
    <div className="case-overview">
      <section className="record-panel">
        <div className="panel-heading"><h2>Case summary</h2><StatusBadge tone="success">{record.status}</StatusBadge></div>
        <p className="record-description">{record.description}</p>
        <dl className="record-facts">
          <div><dt>Category</dt><dd>{record.category}</dd></div>
          <div><dt>Occurrence</dt><dd>{date}</dd></div>
          <div><dt>Location</dt><dd>{record.occurrenceLocation ?? "Not recorded"}</dd></div>
          <div><dt>Investigating officer</dt><dd>{record.investigatingOfficerName ?? "Unassigned"}</dd></div>
        </dl>
      </section>
      <aside className="case-metrics" aria-label="Case record counts">
        <div><span>People</span><strong>{record.peopleCount}</strong></div>
        <div><span>Evidence records</span><strong>{record.evidenceCount}</strong></div>
      </aside>
    </div>
  );
}
