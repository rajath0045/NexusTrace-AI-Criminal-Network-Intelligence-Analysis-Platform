"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileSearch, Fingerprint, Network, Search, Siren } from "lucide-react";
import type { GlobalSearchResponse, SearchResultType } from "@/domain/search";

const icons = { CASE: FileSearch, PERSON: Fingerprint, INCIDENT: Siren, ENTITY: Network } satisfies Record<SearchResultType, typeof Search>;

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const entries = useMemo(() => result?.groups.flatMap((group) => group.results) ?? [], [result]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError(null);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, { credentials: "same-origin", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to search authorized records.");
        setResult(payload); setActive(0);
      } catch (searchError) { if (!(searchError instanceof DOMException && searchError.name === "AbortError")) setError(searchError instanceof Error ? searchError.message : "Unable to search authorized records."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!entries.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => (value + 1) % entries.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => (value - 1 + entries.length) % entries.length); }
    if (event.key === "Enter") { const entry = entries[active]; if (entry) window.location.assign(entry.href); }
  };

  return <section className="search-console" aria-labelledby="search-title">
    <header className="page-header"><div><p className="eyebrow">Authorized record lookup</p><h1 id="search-title">Global search</h1><p>Search is scoped before results are returned. Only records you are authorized to inspect appear here.</p></div></header>
    <div className="search-input-wrap">
      <Search aria-hidden="true" /><input ref={inputRef} autoFocus value={query} onChange={(event) => { const value = event.target.value; setQuery(value); if (value.trim().length < 2) { setResult(null); setError(null); setLoading(false); } }} onKeyDown={onKeyDown} role="combobox" aria-label="Search authorized cases, people, incidents, and network entities" aria-expanded={entries.length > 0} aria-controls="authorized-search-results" aria-activedescendant={entries[active] ? `search-result-${entries[active].type}-${entries[active].id}` : undefined} placeholder="Search FIR, person, incident, or network entity" />
      {loading ? <span className="search-status" role="status">Searching…</span> : null}
    </div>
    {query.trim().length > 0 && query.trim().length < 2 ? <p className="search-hint">Enter at least two characters to search authorized records.</p> : null}
    {error ? <section className="state-panel state-panel--error" role="alert"><h2>Search unavailable</h2><p>{error}</p></section> : null}
    {result && !loading && entries.length === 0 ? <section className="state-panel"><h2>No authorized records found</h2><p>No accessible cases, people, incidents, or network entities match this query.</p></section> : null}
    {result && entries.length > 0 ? <div id="authorized-search-results" className="search-result-groups" role="listbox" aria-label="Authorized search results">{result.groups.map((group) => <section key={group.type} className="search-result-group"><h2>{group.label}</h2><ul>{group.results.map((entry) => { const Icon = icons[entry.type]; const index = entries.findIndex((value) => value.type === entry.type && value.id === entry.id); return <li key={`${entry.type}-${entry.id}`}><Link id={`search-result-${entry.type}-${entry.id}`} href={entry.href} role="option" aria-selected={active === index} className={active === index ? "is-active" : undefined} onMouseEnter={() => setActive(index)}><Icon aria-hidden="true" /><span><strong>{entry.title}</strong><small>{entry.metadata}</small></span><em>{entry.type.replaceAll("_", " ")}</em></Link></li>; })}</ul></section>)}</div> : null}
  </section>;
}
