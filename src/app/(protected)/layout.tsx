import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { getCurrentActor } from "@/server/auth/session";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const actor = await getCurrentActor();

  if (!actor) {
    redirect("/login");
  }

  return <AppShell actor={actor}>{children}</AppShell>;
}
