"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  FileWarning,
  LoaderCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useDocumentationWorkspace, useReferenceSummary } from "../hooks";
import { SectionWorkspace } from "./section-workspace";

// Shown only when it has something the list below does not already say. It
// used to announce "créez votre première section" above a section that existed
// — a banner contradicting the page it sits on is worse than no banner.
function StateBanner({ projectId }: { projectId: string }) {
  const t = useTranslations("Projects.Documentation.Client");
  const workspace = useDocumentationWorkspace(projectId);
  const state = workspace.data;
  const priority = state?.priority ?? "empty";
  const release = state?.releaseProgress;

  const worthSaying =
    (state?.failedOperationCount ?? 0) > 0 ||
    (state?.pendingReviewCount ?? 0) > 0 ||
    (state?.activeOperationCount ?? 0) > 0 ||
    Boolean(state?.currentReleaseId);
  if (!worthSaying) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      {priority === "needs_attention" || priority === "needs_action" ? (
        <AlertTriangle className="mt-0.5 size-5 text-destructive" />
      ) : priority === "processing" ? (
        <LoaderCircle className="mt-0.5 size-5 animate-spin text-primary motion-reduce:animate-none" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-5 text-primary" />
      )}
      <div>
        <p aria-live="polite" className="font-medium">
          {t(`priority_${priority}`)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`visibility_${state?.clientVisibility ?? "nothing_published"}`)}
        </p>
        {/* Atomic publication is the product's most reassuring property, and the
            moment it reassures most is while sections are still waiting. */}
        {release && release.expected > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("releaseProgress", {
              ready: release.ready,
              expected: release.expected,
            })}
          </p>
        )}
        {(state?.pendingReviewCount ?? 0) > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("releaseAtomic")}
          </p>
        )}
        {/* The failing write is not on this page, but the sources list it — so
            the banner carries the way there rather than naming a problem this
            page offers nothing to act on. */}
        {(state?.failedOperationCount ?? 0) > 0 && (
          <p className="mt-2 text-sm">
            <Link
              href={`/projects/${projectId}/documentation/sources`}
              className="inline-flex items-center gap-1.5 rounded-md text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileWarning className="size-4" />
              {t("failedAction")}
            </Link>
          </p>
        )}
        {workspace.isError && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("refreshDelayed")}
          </p>
        )}
      </div>
    </div>
  );
}

// The contributor gate, the back link and the page title moved to
// the documentation layout — this is now step 3's panel, nothing more.
export function ClientContentPage({ projectId }: { projectId: string }) {
  const t = useTranslations("Projects.Documentation.Client");
  const summary = useReferenceSummary(projectId);

  const header = (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t("description")}
      </p>
    </div>
  );

  if (summary.isPending) {
    return (
      <main className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-40 w-full rounded-xl" />
      </main>
    );
  }

  // A section is written from the reference document, so a project without one
  // has a first step rather than a locked door. Naming that step here — and
  // taking the developer straight to it — is the difference between an order
  // and a refusal.
  const referenceReady = summary.data?.document?.status === "ready";
  if (!referenceReady) {
    return (
      <main className="flex flex-col gap-6">
        {header}
        <div className="rounded-xl border border-dashed border-border p-8">
          <p className="font-medium">{t("startTitle")}</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {summary.data?.document?.status === "writing"
              ? t("startWriting")
              : t("startDescription")}
          </p>
          <Button asChild className="mt-5">
            <Link href={`/projects/${projectId}/documentation/sources`}>
              <FilePlus2 />
              {t("startAction")}
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      {header}
      <StateBanner projectId={projectId} />
      <SectionWorkspace projectId={projectId} />
    </main>
  );
}
