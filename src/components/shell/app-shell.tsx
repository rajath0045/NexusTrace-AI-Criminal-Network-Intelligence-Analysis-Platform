import Link from "next/link";
import type { ReactNode } from "react";
import type { Actor, Capability } from "@/domain/auth";
import { can } from "@/server/authorization/policy";
import { logoutAction } from "@/app/login/actions";
import { StatusBadge } from "@/components/ui/status-badge";

interface AppShellProps {
  actor: Actor;
  children: ReactNode;
}

const navigation: ReadonlyArray<{
  href: string;
  label: string;
  code: string;
  capability: Capability;
}> = [
  { href: "/dashboard", label: "Dashboard", code: "00", capability: "CASE_VIEW" },
  { href: "/cases", label: "Cases", code: "01", capability: "CASE_VIEW" },
  { href: "/incidents", label: "Incidents", code: "02", capability: "CASE_VIEW" },
  {
    href: "/network",
    label: "Network",
    code: "03",
    capability: "RELATIONSHIP_SUGGEST",
  },
  { href: "/investigations", label: "Investigation", code: "04", capability: "INVESTIGATION_ANALYZE" },
  {
    href: "/admin",
    label: "Administration",
    code: "05",
    capability: "ADMINISTER",
  },
];

function formatRole(role: Actor["role"]): string {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function AppShell({ actor, children }: AppShellProps) {
  const availableNavigation = navigation.filter((item) =>
    can(actor, item.capability),
  );

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link className="brand-lockup" href="/dashboard" aria-label="NexusTrace dashboard">
          <span className="brand-mark" aria-hidden="true">
            NT
          </span>
          <span>NEXUSTRACE</span>
        </Link>

        <nav className="primary-navigation" aria-label="Primary navigation">
          <p>Workspace</p>
          <ul>
            {availableNavigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <span aria-hidden="true">{item.code}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="operator-card">
          <div className="operator-status">
            <span aria-hidden="true" />
            Authenticated operator
          </div>
          <strong>{actor.displayName}</strong>
          <span>{actor.email}</span>
          <StatusBadge>{formatRole(actor.role)}</StatusBadge>
          <form action={logoutAction}>
            <button type="submit">End session</button>
          </form>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="workspace-header">
          <div>
            <span className="workspace-classification">Restricted workspace</span>
            <span className="workspace-separator" aria-hidden="true">
              /
            </span>
            <span>Synthetic data</span>
          </div>
          <StatusBadge tone="success">System ready</StatusBadge>
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
