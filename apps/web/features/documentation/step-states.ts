import type { DocumentationWorkspace, ReferenceSummary } from "schemas";

// The four places of the documentary feature. The keys are the
// route segments under /projects/[id]/documentation — order is the order of
// the chain, and it never changes (FR-003).
export const STEP_KEYS = ["sources", "reference", "sections", "client"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export type StepTone =
  | "waiting" // blocked on an earlier step — nothing to do here yet
  | "todo" // open for the developer to act
  | "working" // Diaphane is writing; nothing to do but wait
  | "attention" // something failed or went stale
  | "ready" // up to date
  | "unknown"; // the state could not be read — never shown as absent (FR-009, 021)

export interface StepState {
  tone: StepTone;
  // An i18n id under Projects.Documentation.Rail, plus its values — the rail
  // translates; this module stays free of react so the root redirect can use
  // it too.
  line: { id: string; values?: Record<string, number> };
}

export interface StepStatesInput {
  summary: ReferenceSummary | undefined;
  summaryFailed: boolean;
  workspace: DocumentationWorkspace | undefined;
  workspaceFailed: boolean;
}

const UNKNOWN: StepState = { tone: "unknown", line: { id: "stateUnknown" } };

// One function decides what every step says — the rail renders it and the
// root's landing rule reads the same call, so the page you land on and the
// states you see can never disagree (plan § Decisions).
export function stepStates(
  input: StepStatesInput,
): Record<StepKey, StepState> {
  const { summary, summaryFailed, workspace, workspaceFailed } = input;

  const documentCount = summary?.documentCount ?? 0;
  const reference = summary?.document ?? null;

  const sources: StepState = summaryFailed
    ? UNKNOWN
    : documentCount === 0
      ? { tone: "todo", line: { id: "sourcesEmpty" } }
      : {
          tone: "ready",
          line: { id: "sourcesCount", values: { count: documentCount } },
        };

  const referenceStep: StepState = summaryFailed
    ? UNKNOWN
    : documentCount === 0
      ? { tone: "waiting", line: { id: "referenceWaiting" } }
      : reference === null
        ? { tone: "todo", line: { id: "referenceNotWritten" } }
        : reference.status === "writing"
          ? { tone: "working", line: { id: "referenceWriting" } }
          : reference.status === "failed"
            ? { tone: "attention", line: { id: "referenceFailed" } }
            : summary?.needsRewrite
              ? { tone: "attention", line: { id: "referenceOwed" } }
              : (summary?.openPointCount ?? 0) > 0
                ? {
                    tone: "todo",
                    line: {
                      id: "referencePoints",
                      values: { points: summary?.openPointCount ?? 0 },
                    },
                  }
                : { tone: "ready", line: { id: "referenceReady" } };

  // Seen on the real screen (2026-08-29): workspace.failedOperationCount
  // aggregates every failed generation operation, the reference document's
  // included — so a failed reference write turned the rubriques row red too,
  // on a project with no rubrique at all. One failure, reported twice, once in
  // the wrong place. When the reference itself is the failed thing and it
  // accounts for the whole count, the rubriques are blocked on step 2, not
  // broken themselves.
  const referenceFailedOnly =
    reference?.status === "failed" &&
    (workspace?.failedOperationCount ?? 0) <= 1;

  const sections: StepState = workspaceFailed
    ? UNKNOWN
    : workspace === undefined
      ? UNKNOWN
      : workspace.priority === "empty"
        ? { tone: "waiting", line: { id: "sectionsWaiting" } }
        : workspace.priority === "no_sections"
          ? { tone: "todo", line: { id: "sectionsNone" } }
          : workspace.priority === "needs_attention"
            ? referenceFailedOnly
              ? { tone: "waiting", line: { id: "sectionsWaiting" } }
              : {
                  tone: "attention",
                  line: {
                    id: "sectionsFailed",
                    values: { count: workspace.failedOperationCount },
                  },
                }
            : workspace.priority === "needs_action"
              ? {
                  tone: "todo",
                  line: {
                    id: "sectionsReview",
                    values: { count: workspace.pendingReviewCount },
                  },
                }
              : workspace.priority === "processing"
                ? { tone: "working", line: { id: "sectionsProcessing" } }
                : { tone: "ready", line: { id: "sectionsUpToDate" } };

  const client: StepState = workspaceFailed
    ? UNKNOWN
    : workspace === undefined
      ? UNKNOWN
      : workspace.clientVisibility === "nothing_published"
        ? { tone: "waiting", line: { id: "clientNothing" } }
        : workspace.clientVisibility === "previous_version_visible"
          ? { tone: "attention", line: { id: "clientPrevious" } }
          : { tone: "ready", line: { id: "clientCurrent" } };

  return { sources, reference: referenceStep, sections, client };
}

// Where /documentation lands: the first step that is not
// done, and sections once everything is. Derived from the same inputs as the
// rail, in the same file, for the same reason.
export function landingStep(input: StepStatesInput): StepKey {
  const { summary } = input;
  if ((summary?.documentCount ?? 0) === 0) return "sources";
  if (summary?.document?.status !== "ready") return "reference";
  return "sections";
}
