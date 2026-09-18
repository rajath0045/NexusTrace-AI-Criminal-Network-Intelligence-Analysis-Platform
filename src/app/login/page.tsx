import Link from "next/link";
import { redirect } from "next/navigation";
import { RainText } from "@/components/ui/matrix-code";
import { getCurrentActor } from "@/server/auth/session";
import { loginAction } from "./actions";
import { AuthenticationPanel } from "./authentication-panel";

export default async function LoginPage() {
  if (await getCurrentActor()) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-page" aria-label="NexusTrace identity verification">
      <div className="auth-cyber-background" aria-hidden="true">
        <RainText
          fontSize={20}
          color="var(--accent-strong)"
          characters="01"
          fadeOpacity={0.1}
          speed={1.0}
        />
      </div>

      <Link className="auth-back-link" href="/" aria-label="Back to home page">
        <span aria-hidden="true">←</span>
        <span>Back</span>
      </Link>

      <div className="auth-panel-shell">
        <AuthenticationPanel action={loginAction} />
      </div>
    </main>
  );
}
