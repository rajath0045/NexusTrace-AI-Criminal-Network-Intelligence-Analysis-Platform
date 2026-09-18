"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function PeopleError() {
  return <ErrorState title="Profile unavailable" description="The authorized profile could not be loaded. Try again." />;
}
