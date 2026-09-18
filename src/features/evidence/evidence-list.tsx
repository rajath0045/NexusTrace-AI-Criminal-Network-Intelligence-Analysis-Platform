import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EvidenceRecord } from "@/domain/evidence";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceList({ evidence }: { evidence: EvidenceRecord[] }) {
  if (evidence.length === 0) {
    return <EmptyState title="No evidence attached" description="Validated evidence attached to this case will appear here." />;
  }

  return (
    <ul className="evidence-list">
      {evidence.map((record) => (
        <li key={record.id}>
          <div className="evidence-file-mark" aria-hidden="true">FILE</div>
          <div className="evidence-file-copy">
            <a href={`/api/evidence/${record.id}`}>{record.originalFilename}</a>
            <p>{record.description ?? "No evidence description recorded."}</p>
            <div className="evidence-file-meta">
              <span>{record.mediaType}</span>
              <span>{formatBytes(record.byteSize)}</span>
              <span>Uploaded by {record.uploadedByName}</span>
              <span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(record.uploadedAt)}</span>
            </div>
          </div>
          <StatusBadge tone={record.verificationState === "VERIFIED" ? "success" : "warning"}>
            {record.verificationState}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}
