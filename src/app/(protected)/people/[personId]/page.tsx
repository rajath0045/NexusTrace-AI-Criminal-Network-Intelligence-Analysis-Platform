import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProfileCases } from "@/features/people/profile-cases";
import { ProfileHeader } from "@/features/people/profile-header";
import { ProfileRelationships } from "@/features/people/profile-relationships";
import { ProfileTabs, type ProfileTabDefinition } from "@/features/people/profile-tabs";
import { getCurrentActor } from "@/server/auth/session";
import { getPersonProfile } from "@/server/services/person-service";

function DeferredSection({ title }: { title: string }) {
  return <EmptyState title={`No ${title.toLowerCase()} in this phase`} description={`${title} will appear here when verified records are added in a later approved phase.`} />;
}

export default async function PersonProfilePage({ params }: { params: Promise<{ personId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");

  let profile;
  try {
    profile = await getPersonProfile(actor, (await params).personId);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const birthDate = profile.dateOfBirth
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(profile.dateOfBirth)
    : "Not recorded";

  const tabs: ProfileTabDefinition[] = [
    {
      id: "identity",
      label: "Identity",
      content: (
        <dl className="record-facts profile-facts">
          <div><dt>Legal name</dt><dd>{profile.displayName}</dd></div>
          <div><dt>Aliases</dt><dd>{profile.aliases.length > 0 ? profile.aliases.join(", ") : "None recorded"}</dd></div>
          <div><dt>Date of birth</dt><dd>{birthDate}</dd></div>
          <div><dt>Gender</dt><dd>{profile.gender ?? "Not recorded"}</dd></div>
          <div><dt>Nationality</dt><dd>{profile.nationality ?? "Not recorded"}</dd></div>
          <div><dt>Canonical reference</dt><dd>{profile.identityReference ?? profile.id}</dd></div>
        </dl>
      ),
    },
    { id: "cases", label: "Cases", content: <ProfileCases cases={profile.cases} /> },
    { id: "associates", label: "Associates", content: <DeferredSection title="Associates" /> },
    { id: "communications", label: "Communications", content: <DeferredSection title="Communications" /> },
    { id: "financial-activity", label: "Financial Activity", content: <DeferredSection title="Financial activity" /> },
    { id: "assets", label: "Assets", content: <DeferredSection title="Assets" /> },
    { id: "locations", label: "Locations", content: <DeferredSection title="Locations" /> },
    {
      id: "evidence",
      label: "Evidence",
      content: profile.evidence.length === 0 ? <DeferredSection title="Evidence" /> : (
        <ul className="evidence-summary-list">
          {profile.evidence.map((evidence) => (
            <li key={evidence.id}>
              <div><a href={`/api/evidence/${evidence.id}`}><strong>{evidence.originalFilename}</strong></a><span>{evidence.mediaType}</span></div>
              <StatusBadge>{evidence.verificationState}</StatusBadge>
            </li>
          ))}
        </ul>
      ),
    },
    { id: "relationships", label: "Relationships", content: <ProfileRelationships /> },
  ];

  return (
    <div className="page-stack">
      <Link className="back-link" href={profile.cases[0] ? `/cases/${profile.cases[0].id}` : "/cases"}>← Back to case</Link>
      <ProfileHeader profile={profile} />
      <ProfileTabs tabs={tabs} />
    </div>
  );
}
