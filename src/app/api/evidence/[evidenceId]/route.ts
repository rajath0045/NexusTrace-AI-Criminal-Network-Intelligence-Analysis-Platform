import { getCurrentActor } from "@/server/auth/session";
import { openEvidence } from "@/server/services/evidence-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return new Response("Authentication required.", { status: 401 });

  try {
    const { record, stream } = await openEvidence(actor, (await params).evidenceId);
    const encodedFilename = encodeURIComponent(record.originalFilename);
    return new Response(stream, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(record.byteSize),
        "Content-Type": record.mediaType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "NOT_FOUND" || error.code === "STORAGE") {
        return new Response("Evidence not found.", { status: 404 });
      }
      if (error.code === "FORBIDDEN") return new Response("Forbidden.", { status: 403 });
    }
    return new Response("Evidence retrieval failed.", { status: 500 });
  }
}
