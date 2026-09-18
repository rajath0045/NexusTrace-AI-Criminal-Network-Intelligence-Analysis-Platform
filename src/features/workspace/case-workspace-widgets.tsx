import Link from "next/link";
import type { Actor } from "@/domain/auth";
import type { CaseSummary } from "@/domain/case";
import { UserRole } from "@/domain/model";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CaseTable } from "@/features/cases/case-table";

function toneForStatus(status: CaseSummary["status"]) {
  if (status === "ACTIVE" || status === "OPEN") return "success" as const;
  if (status === "SUSPENDED") return "warning" as const;
  return "neutral" as const;
}

function formatRole(role: Actor["role"]): string {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function CaseStatusSummary({ cases }: { cases: CaseSummary[] }) {
  const counts = cases.reduce<Record<string, number>>((summary, record) => {
    summary[record.status] = (summary[record.status] ?? 0) + 1;
    return summary;
  }, {});

  return (
    <section className="workspace-widget-panel">
      <header>
        <p className="eyebrow">Authorized records</p>
        <h2>Case status</h2>
      </header>
      {cases.length === 0 ? (
        <p className="workspace-widget-muted">No cases are available in this access scope.</p>
      ) : (
        <dl className="workspace-status-grid">
          {Object.entries(counts).map(([status, count]) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>{String(count).padStart(2, "0")}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function RecentInvestigations({
  cases,
  title = "Recent investigations",
}: {
  cases: CaseSummary[];
  title?: string;
}) {
  const recent = cases.slice(0, 5);
  return (
    <section className="workspace-widget-panel">
      <header>
        <p className="eyebrow">Latest authorized updates</p>
        <h2>{title}</h2>
      </header>
      {recent.length === 0 ? (
        <EmptyState
          title="No authorized cases"
          description="Cases available to your access scope will appear here."
        />
      ) : (
        <ol className="workspace-record-list">
          {recent.map((record) => (
            <li key={record.id}>
              <Link href={`/cases/${record.id}`}>
                <span>
                  <strong>{record.title}</strong>
                  <small>
                    {record.firNumber} / {record.caseNumber}
                  </small>
                </span>
                <StatusBadge tone={toneForStatus(record.status)}>
                  {record.status}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function CurrentInvestigations({ cases }: { cases: CaseSummary[] }) {
  return (
    <section className="workspace-widget-panel workspace-widget-panel--table">
      <header className="workspace-widget-heading-row">
        <div>
          <p className="eyebrow">Authorized records</p>
          <h2>Current investigations</h2>
        </div>
        <span className="workspace-record-count">
          {String(cases.length).padStart(2, "0")}
        </span>
      </header>
      <CaseTable cases={cases} />
    </section>
  );
}

export function AccessScope({ actor }: { actor: Actor }) {
  const scope =
    actor.role === UserRole.Administrator
      ? "All authorized departments"
      : "Your assigned department";
  return (
    <section className="workspace-widget-panel">
      <header>
        <p className="eyebrow">Session authority</p>
        <h2>Access scope</h2>
      </header>
      <dl className="workspace-facts">
        <div>
          <dt>Operator</dt>
          <dd>{actor.displayName}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{formatRole(actor.role)}</dd>
        </div>
        <div>
          <dt>Record scope</dt>
          <dd>{scope}</dd>
        </div>
      </dl>
    </section>
  );
}

export function RegisterCaseWidget() {
  return (
    <section className="workspace-widget-panel workspace-action-widget">
      <div>
        <p className="eyebrow">Authorized action</p>
        <h2>Register case</h2>
        <p>Create a new FIR-linked investigation in your department.</p>
      </div>
      <Link className="primary-button" href="/cases/new">
        Register case
      </Link>
    </section>
  );
}
