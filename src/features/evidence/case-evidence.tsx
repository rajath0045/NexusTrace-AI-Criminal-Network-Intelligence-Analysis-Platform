import type { AttachEvidenceState } from "@/app/(protected)/cases/[caseId]/evidence/actions";
import type { EvidenceRecord } from "@/domain/evidence";
import { EvidenceList } from "./evidence-list";
import { EvidenceUploadForm } from "./evidence-upload-form";

type AttachEvidenceAction = (
  previousState: AttachEvidenceState,
  formData: FormData,
) => Promise<AttachEvidenceState>;

export function CaseEvidence({
  action,
  caseId,
  evidence,
}: {
  action?: AttachEvidenceAction;
  caseId: string;
  evidence: EvidenceRecord[];
}) {
  return (
    <section className="record-panel case-evidence-panel">
      <div className="panel-heading">
        <div><p className="panel-kicker">Protected provenance</p><h2>Evidence</h2></div>
        <span className="record-count">{String(evidence.length).padStart(2, "0")}</span>
      </div>
      <EvidenceList evidence={evidence} />
      {action ? (
        <details className="association-disclosure">
          <summary>Attach evidence</summary>
          <EvidenceUploadForm action={action} caseId={caseId} />
        </details>
      ) : null}
    </section>
  );
}
