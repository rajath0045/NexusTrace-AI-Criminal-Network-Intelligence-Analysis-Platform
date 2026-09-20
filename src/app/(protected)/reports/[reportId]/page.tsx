import { notFound, redirect } from "next/navigation";
import { ReportDetailView } from "@/features/reports/report-detail";
import { getCurrentActor } from "@/server/auth/session";
import { getReport } from "@/server/services/report-service";
export default async function ReportPage({ params, searchParams }: { params: Promise<{ reportId: string }>; searchParams: Promise<{ version?: string }> }) { const actor = await getCurrentActor(); if (!actor) redirect("/login"); const { reportId } = await params; const value = (await searchParams).version; let report; try { report = await getReport(actor, reportId, value ? Number(value) : undefined); } catch { notFound(); } return <ReportDetailView report={report} />; }
