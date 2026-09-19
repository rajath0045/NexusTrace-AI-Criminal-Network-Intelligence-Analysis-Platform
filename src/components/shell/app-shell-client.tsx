"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CircleUserRound,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Radar,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { logoutAction } from "@/app/login/actions";
import type { Actor } from "@/domain/auth";

export type ShellIcon =
  | "dashboard"
  | "cases"
  | "incidents"
  | "network"
  | "investigation";

export interface ShellNavigationItem {
  href: string;
  label: string;
  icon: ShellIcon;
}

interface AppShellClientProps {
  actor: Actor;
  navigation: ShellNavigationItem[];
  children: ReactNode;
}

const icons: Record<ShellIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  cases: FolderKanban,
  incidents: Activity,
  network: Network,
  investigation: Radar,
};

function formatRole(role: Actor["role"]): string {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function SidebarNavigation({
  navigation,
  pathname,
  expanded,
  onNavigate,
}: {
  navigation: ShellNavigationItem[];
  pathname: string;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="shell-navigation" aria-label="Primary navigation">
      <p className="shell-section-label">Workspace</p>
      <ul>
        {navigation.map((item) => {
          const Icon = icons[item.icon];
          const active = isActiveRoute(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={active ? "is-active" : undefined}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={!expanded ? item.label : undefined}
                onClick={onNavigate}
              >
                <Icon aria-hidden="true" />
                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.span
                      initial={{ opacity: 0, x: -7 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -7 }}
                      transition={{ duration: 0.16 }}
                    >
                      {item.label}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function OperatorSummary({ actor, expanded }: { actor: Actor; expanded: boolean }) {
  return (
    <div className="shell-operator" aria-label="Authenticated operator">
      <span className="shell-avatar" aria-hidden="true">
        {initials(actor.displayName)}
      </span>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            className="shell-operator-copy"
            initial={{ opacity: 0, x: -7 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -7 }}
            transition={{ duration: 0.16 }}
          >
            <strong>{actor.displayName}</strong>
            <span>{formatRole(actor.role)}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SidebarContents({
  actor,
  navigation,
  pathname,
  expanded,
  onNavigate,
}: {
  actor: Actor;
  navigation: ShellNavigationItem[];
  pathname: string;
  expanded: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link className="shell-brand" href="/dashboard" aria-label="NexusTrace dashboard">
        <span className="shell-brand-mark" aria-hidden="true">NT</span>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.span
              className="shell-brand-copy"
              initial={{ opacity: 0, x: -7 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -7 }}
              transition={{ duration: 0.16 }}
            >
              <strong>NEXUSTRACE</strong>
              <small>Intelligence system</small>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </Link>

      <SidebarNavigation navigation={navigation} pathname={pathname} expanded={expanded} onNavigate={onNavigate} />

      <div className="shell-sidebar-footer">
        <OperatorSummary actor={actor} expanded={expanded} />
        <form action={logoutAction}>
          <button type="submit" aria-label="End session" title={!expanded ? "End session" : undefined}>
            <LogOut aria-hidden="true" />
            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.span
                  initial={{ opacity: 0, x: -7 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -7 }}
                  transition={{ duration: 0.16 }}
                >
                  End session
                </motion.span>
              ) : null}
            </AnimatePresence>
          </button>
        </form>
      </div>
    </>
  );
}

export function AppShellClient({ actor, navigation, children }: AppShellClientProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const currentNavigation = useMemo(
    () => navigation.find((item) => isActiveRoute(pathname, item.href)),
    [navigation, pathname],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const motionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-frame app-frame--cinematic">
        <motion.aside
          ref={sidebarRef}
          className="app-sidebar app-sidebar--desktop"
          aria-label="NexusTrace navigation"
          animate={{ width: expanded ? 272 : 68 }}
          transition={motionTransition}
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          onFocusCapture={() => setExpanded(true)}
          onBlurCapture={(event) => {
            if (!sidebarRef.current?.contains(event.relatedTarget)) setExpanded(false);
          }}
        >
          <SidebarContents actor={actor} navigation={navigation} pathname={pathname} expanded={expanded} />
        </motion.aside>

        <div className="app-workspace">
          <header className="workspace-header workspace-header--command">
            <button
              className="mobile-navigation-trigger"
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <div className="workspace-context">
              <span className="workspace-classification">Restricted workspace</span>
              <span className="workspace-context-route">{currentNavigation?.label ?? "NexusTrace"}</span>
            </div>
            <div className="workspace-system-status">
              <span className="workspace-ready-dot" aria-hidden="true" />
              <span>System ready</span>
              <CircleUserRound aria-hidden="true" />
              <span className="workspace-operator-name">{actor.displayName}</span>
            </div>
          </header>
          <main className="workspace-content">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                className="workspace-route-stage"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -5 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="mobile-navigation-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="mobile-navigation-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="mobile-navigation-drawer"
              aria-label="Mobile navigation"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={motionTransition}
            >
              <button className="mobile-navigation-close" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
                <X aria-hidden="true" />
              </button>
              <SidebarContents actor={actor} navigation={navigation} pathname={pathname} expanded onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
