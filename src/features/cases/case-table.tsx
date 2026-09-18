import Link from "next/link";
import type { CaseSummary } from "@/domain/case";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

function statusTone(status: CaseSummary["status"]) {
  if (status === "ACTIVE" || status === "OPEN") return "success" as const;
  if (status === "SUSPENDED") return "warning" as const;
  return "neutral" as const;
}

export function CaseTable({ cases }: { cases: CaseSummary[] }) {
  if (cases.length === 0) {
    return <EmptyState title="No authorized cases" description="Cases available to your department will appear here." />;
  }

  return (
    <div className="table-frame">
      <table>
        <thead>
          <tr><th>FIR / Case</th><th>Investigation</th><th>Department</th><th>Status</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {cases.map((record) => (
            <tr key={record.id}>
              <td><Link href={`/cases/${record.id}`}><strong>{record.firNumber}</strong><span>{record.caseNumber}</span></Link></td>
              <td><strong>{record.title}</strong><span>{record.category}</span></td>
              <td>{record.departmentName}</td>
              <td><StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge></td>
              <td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(record.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
