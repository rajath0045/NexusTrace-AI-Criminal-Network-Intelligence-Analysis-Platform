"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  FolderKanban,
  Network,
  Radar,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { CaseSummary } from "@/domain/case";

type DashboardModuleKind = "cases" | "network" | "incidents" | "investigation";

interface DashboardModule {
  action: string;
  description: string;
  href: string;
  icon: LucideIcon;
  id: DashboardModuleKind;
  metric: string;
  metricLabel: string;
  title: string;
}

interface DashboardCommandCenterProps {
  canAnalyze: boolean;
  canUseNetwork: boolean;
  cases: CaseSummary[];
  incidentCount: number;
}

export function DashboardCommandCenter({
  canAnalyze,
  canUseNetwork,
  cases,
  incidentCount,
}: DashboardCommandCenterProps) {
  const [activeModule, setActiveModule] = useState<DashboardModuleKind | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const activeCases = cases.filter((record) => record.status === "ACTIVE").length;
  const openCases = cases.filter((record) => record.status === "OPEN").length;
  const mostRecent = cases[0];
  const modules: DashboardModule[] = [
    {
      id: "cases",
      title: "Cases",
      description: mostRecent
        ? `Latest authorized record: ${mostRecent.firNumber}.`
        : "Authorized FIRs and investigations in your current scope.",
      action: "View cases",
      href: "/cases",
      metric: String(cases.length).padStart(2, "0"),
      metricLabel: "authorized records",
      icon: FolderKanban,
    },
    ...(canUseNetwork
      ? [{
          id: "network" as const,
          title: "Network",
          description: "Evidence-backed geographic and relationship analysis.",
          action: "Open network",
          href: "/network",
          metric: "LIVE",
          metricLabel: "intelligence graph",
          icon: Network,
        }]
      : []),
    {
      id: "incidents",
      title: "Incidents",
      description: "Temporal intelligence and submitted observations in scope.",
      action: "View incidents",
      href: "/incidents",
      metric: String(incidentCount).padStart(2, "0"),
      metricLabel: "authorized incidents",
      icon: Activity,
    },
    ...(canAnalyze
      ? [{
          id: "investigation" as const,
          title: "Investigation",
          description: "Bounded analysis, transparent change detection, and review leads.",
          action: "Open investigation",
          href: "/investigations",
          metric: "READY",
          metricLabel: "analysis workspace",
          icon: Radar,
        }]
      : []),
  ];

  return (
    <section className="dashboard-command-center" aria-label="Intelligence workspace overview">
      <div className="dashboard-command-summary">
        <div>
          <p className="eyebrow">Current investigation workspace</p>
          <h2>Operational overview</h2>
          <p>Authorized intelligence, routes, and activity for this session.</p>
        </div>
        <dl className="dashboard-metrics" aria-label="Authorized case metrics">
          <div>
            <dt>Active</dt>
            <dd>{String(activeCases).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt>Open</dt>
            <dd>{String(openCases).padStart(2, "0")}</dd>
          </div>
          <div>
            <dt>In scope</dt>
            <dd>{String(cases.length).padStart(2, "0")}</dd>
          </div>
        </dl>
      </div>

      <div className="dashboard-module-stage" data-active={activeModule ?? undefined}>
        {modules.map((module, index) => {
          const Icon = module.icon;
          const active = activeModule === module.id;
          return (
            <motion.article
              key={module.id}
              className={`dashboard-focus-module dashboard-focus-module--${module.id}`}
              data-active={active || undefined}
              tabIndex={0}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, delay: index * 0.045, ease: "easeOut" }}
              onFocus={() => setActiveModule(module.id)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setActiveModule(null);
              }}
              onPointerEnter={() => setActiveModule(module.id)}
              onPointerLeave={() => setActiveModule(null)}
              onClick={(event) => {
                if (!(event.target instanceof HTMLAnchorElement)) setActiveModule(module.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveModule(module.id);
                }
              }}
            >
              <span className="dashboard-module-visual" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <header>
                <span className="dashboard-module-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="dashboard-module-metric">
                  <strong>{module.metric}</strong>
                  <small>{module.metricLabel}</small>
                </span>
              </header>
              <div className="dashboard-module-copy">
                <p className="eyebrow">{module.id}</p>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
              </div>
              <Link className="dashboard-module-action" href={module.href} tabIndex={active ? 0 : -1}>
                {module.action}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
