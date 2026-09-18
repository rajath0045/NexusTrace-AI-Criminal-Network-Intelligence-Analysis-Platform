"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function CasesError({ reset }: { reset: () => void }) {
  return <div className="page-stack"><ErrorState /><button className="secondary-button" type="button" onClick={reset}>Try again</button></div>;
}
