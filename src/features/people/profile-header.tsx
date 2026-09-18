import { StatusBadge } from "@/components/ui/status-badge";
import type { PersonProfile } from "@/domain/person";

export function ProfileHeader({ profile }: { profile: PersonProfile }) {
  return (
    <header className="profile-header">
      <div className="profile-monogram" aria-hidden="true">
        {profile.givenName[0]}{profile.familyName[0]}
      </div>
      <div>
        <p className="eyebrow">Canonical person profile</p>
        <h1>{profile.displayName}</h1>
        <div className="profile-meta">
          <StatusBadge tone="success">Authorized record</StatusBadge>
          <span>{profile.identityReference ?? "Reference pending"}</span>
          <span>{profile.cases.length} authorized case{profile.cases.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </header>
  );
}
