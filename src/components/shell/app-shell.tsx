import type { ReactNode } from "react";
import type { Actor, Capability } from "@/domain/auth";
import { can } from "@/server/authorization/policy";
import { AppShellClient, type ShellNavigationItem } from "./app-shell-client";

interface AppShellProps {
  actor: Actor;
  children: ReactNode;
}

const navigation: readonly (ShellNavigationItem & { capability: Capability })[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", capability: "CASE_VIEW" },
  { href: "/cases", label: "Cases", icon: "cases", capability: "CASE_VIEW" },
  { href: "/incidents", label: "Incidents", icon: "incidents", capability: "CASE_VIEW" },
  { href: "/network", label: "Network", icon: "network", capability: "RELATIONSHIP_SUGGEST" },
  { href: "/investigations", label: "Investigation", icon: "investigation", capability: "INVESTIGATION_ANALYZE" },
  { href: "/search", label: "Search", icon: "search", capability: "CASE_VIEW" },
  { href: "/reports", label: "Reports", icon: "reports", capability: "CASE_VIEW" },
  { href: "/admin", label: "Administration", icon: "administration", capability: "ADMINISTER" },
  { href: "/audit", label: "Audit", icon: "audit", capability: "ADMINISTER" },
];

export function AppShell({ actor, children }: AppShellProps) {
  const availableNavigation = navigation
    .filter((item) => can(actor, item.capability))
    .map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
    }));

  return (
    <AppShellClient actor={actor} navigation={availableNavigation}>
      {children}
    </AppShellClient>
  );
}
