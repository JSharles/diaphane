"use client";

import {
  CheckCircle2,
  CircleDashed,
  HelpCircle,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { useDocumentationWorkspace, useReferenceSummary } from "../hooks";
import { STEP_KEYS, stepStates, type StepKey, type StepTone } from "../step-states";

const TONE_ICON: Record<StepTone, typeof CircleDashed> = {
  waiting: CircleDashed,
  todo: CircleDashed,
  working: LoaderCircle,
  attention: TriangleAlert,
  ready: CheckCircle2,
  unknown: HelpCircle,
};

const TONE_CLASS: Record<StepTone, string> = {
  waiting: "text-muted-foreground",
  todo: "text-foreground",
  working: "text-muted-foreground",
  attention: "text-destructive",
  ready: "text-primary",
  unknown: "text-muted-foreground",
};

// The four steps, permanently on screen with their states — what turns a heap
// of pages into a sequence you can see without being told (specs/022). Not
// tabs: tabs show the step you are in and hide the rest, which is the exact
// failure this exists to fix. The numbers never move; week one this reads as
// steps, week six as a table of contents with states.
export function DocumentationRail({ projectId }: { projectId: string }) {
  const t = useTranslations("Projects.Documentation.Rail");
  const pathname = usePathname();
  const summary = useReferenceSummary(projectId);
  const workspace = useDocumentationWorkspace(projectId);

  const pending = summary.isPending || workspace.isPending;
  const states = stepStates({
    summary: summary.data,
    summaryFailed: summary.isError,
    workspace: workspace.data,
    workspaceFailed: workspace.isError,
  });

  // /sources/[documentId] is a sub-page of step 1 and keeps its row active.
  const activeStep: StepKey | null =
    STEP_KEYS.find((key) => pathname.includes(`/documentation/${key}`)) ?? null;

  return (
    <nav aria-label={t("label")}>
      <ol className="flex flex-col">
        {STEP_KEYS.map((key, index) => {
          const state = states[key];
          const active = key === activeStep;
          const Icon = TONE_ICON[state.tone];

          return (
            <li key={key} className="relative flex gap-3 pb-5 last:pb-0">
              {/* the connector between numbers */}
              {index < STEP_KEYS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-8 bottom-1 left-3.5 w-px bg-border"
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : state.tone === "ready"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              <Link
                href={`/projects/${projectId}/documentation/${key}`}
                aria-current={active ? "page" : undefined}
                className="group min-w-0 rounded-md pt-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "block text-sm font-medium group-hover:text-foreground",
                    active || state.tone === "todo" || state.tone === "ready"
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {t(`name_${key}`)}
                </span>
                {pending ? (
                  <Skeleton className="mt-1 h-3.5 w-28" />
                ) : (
                  <span
                    className={cn(
                      "mt-0.5 flex items-center gap-1.5 text-xs",
                      TONE_CLASS[state.tone],
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        state.tone === "working" &&
                          "animate-spin motion-reduce:animate-none",
                      )}
                    />
                    {t(state.line.id, state.line.values)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
