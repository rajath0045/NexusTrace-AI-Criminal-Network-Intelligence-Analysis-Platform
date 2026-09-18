import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { PersonCaseSummary } from "@/domain/person";

export function ProfileCases({ cases }: { cases: PersonCaseSummary[] }) {
  if (cases.length === 0) {
    return <EmptyState title="No authorized cases" description="No case participation is visible within your access scope." />;
  }

  return (
    <div className="table-frame">
      <table>
        <thead><tr><th>FIR / Case</th><th>Investigation</th><th>Role</th><th>Status</th></tr></thead>
        <tbody>
          {cases.map((record) => (
            <tr key={`${record.id}-${record.participation}`}>
              <td><Link href={`/cases/${record.id}`}><strong>{record.firNumber}</strong><span>{record.caseNumber}</span></Link></td>
              <td><strong>{record.title}</strong><span>{record.departmentName}</span></td>
              <td><StatusBadge>{record.participation}</StatusBadge></td>
              <td><StatusBadge tone="success">{record.status}</StatusBadge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
