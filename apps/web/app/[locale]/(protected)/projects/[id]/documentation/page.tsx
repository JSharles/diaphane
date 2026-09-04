"use client";

import { use, useEffect } from "react";
import { useReferenceSummary } from "@/features/documentation/hooks";
import { landingStep } from "@/features/documentation/step-states";
import { useRouter } from "@/i18n/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";

// The feature root renders nothing: it lands the developer on the first step
// that is not done, and on the rubriques once everything is. replace, not
// push — the back button must never return to an empty root. The rule reads
// the same module as the rail's states, so where
// you land and what the rail says can never disagree.
export default function DocumentationRootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const summary = useReferenceSummary(id);
  const router = useRouter();

  const resolved = !summary.isPending;

  useEffect(() => {
    if (!resolved) return;
    const step = landingStep({
      summary: summary.data,
      summaryFailed: summary.isError,
      workspace: undefined,
      workspaceFailed: false,
    });
    router.replace(`/projects/${id}/documentation/${step}`);
  }, [resolved, summary.data, summary.isError, id, router]);

  return <Skeleton className="h-48 w-full" />;
}
