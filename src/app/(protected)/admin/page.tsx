import { redirect } from "next/navigation";
import { AdministrationConsole } from "@/features/admin/administration-console";
import { getCurrentActor } from "@/server/auth/session";
import { can } from "@/server/authorization/policy";
import { getAdministrationGovernance, listAdministrationDepartments, listAdministrationUsers } from "@/server/services/administration-service";

export default async function AdministrationPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/login");
  if (!can(actor, "ADMINISTER")) redirect("/dashboard");
  const [initialUsers, departments, governance] = await Promise.all([listAdministrationUsers(actor), listAdministrationDepartments(actor), getAdministrationGovernance(actor)]);
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Administrator-only governance</p><h1>Administration</h1><p>Manage authorized operators and review department verification context without bypassing investigation workflows.</p></div></header><AdministrationConsole initialUsers={initialUsers} departments={departments} governance={governance} currentUserId={actor.userId} /></div>;
}
