import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/server/auth/session";
import { loginAction } from "./actions";
import { AuthenticationPanel } from "./authentication-panel";

const MATRIX_CHARACTERS = "01";

const matrixColumns = Array.from({ length: 44 }, (_, index) => {
  const columnLength = 16 + ((index * 5) % 15);
  const duration = 14 + (index % 7) * 1.8;
  const delay = -((index * 2.35) % duration);

  return {
    id: index,
    duration,
    delay,
    characters: Array.from({ length: columnLength }, (_, charIndex) => ({
      id: `${index}-${charIndex}`,
      value: MATRIX_CHARACTERS[(index * 7 + charIndex * 3 + charIndex) % MATRIX_CHARACTERS.length],
      opacity: 0.58 + ((charIndex % 6) * 0.08),
    })),
  };
});

export default async function LoginPage() {
  if (await getCurrentActor()) {
    redirect("/cases");
  }

  return (
    <main className="auth-page" aria-label="NexusTrace identity verification">
      <div className="auth-cyber-background" aria-hidden="true">
        <div className="auth-matrix">
          {matrixColumns.map((column) => (
            <div
              key={column.id}
              className="matrix-column"
              style={
                {
                  "--matrix-duration": `${column.duration}s`,
                  "--matrix-delay": `${column.delay}s`,
                } as CSSProperties
              }
            >
              {column.characters.map((character) => (
                <span
                  key={character.id}
                  style={{ opacity: character.opacity }}
                >
                  {character.value}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="auth-vignette" />
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
