import Link from "next/link";

const principles = [
  "Evidence-linked intelligence",
  "Human verification at every critical step",
  "Role-scoped investigative access",
];

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="landing-panel" aria-labelledby="product-title">
        <div className="brand-lockup" aria-label="NexusTrace AI">
          <span className="brand-mark" aria-hidden="true">
            NT
          </span>
          <span>NEXUSTRACE / INTELLIGENCE SYSTEM</span>
        </div>

        <div className="landing-copy">
          <p className="eyebrow">Authorized investigation workspace</p>
          <h1 id="product-title">NexusTrace AI</h1>
          <p className="landing-lede">
            A unified environment for tracing people, cases, evidence, and verified
            relationships across complex investigations.
          </p>
        </div>

        <ul className="principle-list" aria-label="Platform principles">
          {principles.map((principle, index) => (
            <li key={principle}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {principle}
            </li>
          ))}
        </ul>

        <div className="landing-actions">
          <Link className="primary-action" href="/login">
            Enter workspace
            <span aria-hidden="true">→</span>
          </Link>
          <p>Investigative leads require human review.</p>
        </div>
      </section>

      <aside className="landing-visual" aria-label="System status">
        <div className="signal-grid" aria-hidden="true" />
        <div className="status-cluster">
          <p>System posture</p>
          <strong>Human-in-the-loop</strong>
          <span>
            <i aria-hidden="true" /> Synthetic demonstration environment
          </span>
        </div>
      </aside>
    </main>
  );
}
