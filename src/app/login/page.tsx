import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/auth/session";
import { loginAction } from "./actions";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentActor()) {
    redirect("/cases");
  }

  return (
    <main className="login-shell">
      <section className="login-context" aria-labelledby="login-title">
        <Link className="brand-lockup" href="/" aria-label="NexusTrace home">
          <span className="brand-mark" aria-hidden="true">
            NT
          </span>
          <span>NEXUSTRACE / INTELLIGENCE SYSTEM</span>
        </Link>

        <div className="login-context-copy">
          <p className="eyebrow">Secure operator access</p>
          <h1 id="login-title">Enter the investigation workspace.</h1>
          <p>
            Access is role-scoped, session activity is auditable, and all records in
            this environment are synthetic.
          </p>
        </div>

        <dl className="access-posture">
          <div>
            <dt>Session</dt>
            <dd>12-hour revocable access</dd>
          </div>
          <div>
            <dt>Data posture</dt>
            <dd>Synthetic demonstration records</dd>
          </div>
        </dl>
      </section>

      <section className="login-panel" aria-label="Sign in">
        <div className="login-card">
          <div>
            <p className="login-kicker">Identity verification</p>
            <h2>Sign in</h2>
            <p className="login-instruction">
              Use an authorized NexusTrace demonstration account.
            </p>
          </div>
          <LoginForm action={loginAction} />
          <p className="login-notice">
            Authentication events are recorded without storing submitted passwords.
          </p>
        </div>
      </section>
    </main>
  );
}
