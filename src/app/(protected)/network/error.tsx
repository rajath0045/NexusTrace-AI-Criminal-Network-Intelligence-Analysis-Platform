"use client";

export default function NetworkError({ reset }: { reset: () => void }) {
  return <section className="network-error-state"><p className="eyebrow">Network unavailable</p><h1>Authorized graph data could not be opened.</h1><p>The entity may be unavailable or outside the current investigation scope.</p><button type="button" className="primary-button" onClick={reset}>Try again</button></section>;
}
