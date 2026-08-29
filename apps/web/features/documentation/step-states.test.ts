import { describe, expect, it } from "vitest";
import type { DocumentationWorkspace, ReferenceSummary } from "schemas";
import { landingStep, stepStates, type StepStatesInput } from "./step-states";

function summaryOf(overrides: Partial<ReferenceSummary> = {}): ReferenceSummary {
  return {
    documentCount: 0,
    noteCount: 0,
    openPointCount: 0,
    needsRewrite: false,
    document: null,
    ...overrides,
  } as ReferenceSummary;
}

function workspaceOf(
  overrides: Partial<DocumentationWorkspace> = {},
): DocumentationWorkspace {
  return {
    priority: "empty",
    activeOperationCount: 0,
    openPointCount: 0,
    pendingReviewCount: 0,
    failedOperationCount: 0,
    documentCount: 0,
    referenceNeedsRewrite: false,
    currentReleaseId: null,
    pendingReleaseId: null,
    releaseProgress: null,
    clientVisibility: "nothing_published",
    changeToken: "t",
    refreshAfterMs: 5000,
    ...overrides,
  } as DocumentationWorkspace;
}

function input(overrides: Partial<StepStatesInput> = {}): StepStatesInput {
  return {
    summary: summaryOf(),
    summaryFailed: false,
    workspace: workspaceOf(),
    workspaceFailed: false,
    ...overrides,
  };
}

const doc = (status: "writing" | "ready" | "failed") =>
  ({ status }) as ReferenceSummary["document"];

describe("stepStates", () => {
  it("reads a fresh project as one open step and three waiting ones", () => {
    const s = stepStates(input());

    expect(s.sources).toEqual({ tone: "todo", line: { id: "sourcesEmpty" } });
    expect(s.reference.tone).toBe("waiting");
    expect(s.sections.tone).toBe("waiting");
    expect(s.client).toEqual({ tone: "waiting", line: { id: "clientNothing" } });
  });

  it("counts the documents once there are some", () => {
    const s = stepStates(
      input({ summary: summaryOf({ documentCount: 3, document: doc("ready") }) }),
    );

    expect(s.sources).toEqual({
      tone: "ready",
      line: { id: "sourcesCount", values: { count: 3 } },
    });
  });

  it("says the reference is being written while it is", () => {
    const s = stepStates(
      input({ summary: summaryOf({ documentCount: 1, document: doc("writing") }) }),
    );

    expect(s.reference).toEqual({
      tone: "working",
      line: { id: "referenceWriting" },
    });
  });

  it("raises a failed write as attention, not as absence", () => {
    const s = stepStates(
      input({ summary: summaryOf({ documentCount: 1, document: doc("failed") }) }),
    );

    expect(s.reference.tone).toBe("attention");
  });

  it("flags a reference owed a rewrite over its open points", () => {
    const s = stepStates(
      input({
        summary: summaryOf({
          documentCount: 2,
          document: doc("ready"),
          needsRewrite: true,
          openPointCount: 4,
        }),
      }),
    );

    expect(s.reference).toEqual({ tone: "attention", line: { id: "referenceOwed" } });
  });

  it("carries the open points when the reference is otherwise current", () => {
    const s = stepStates(
      input({
        summary: summaryOf({
          documentCount: 2,
          document: doc("ready"),
          openPointCount: 2,
        }),
      }),
    );

    expect(s.reference).toEqual({
      tone: "todo",
      line: { id: "referencePoints", values: { points: 2 } },
    });
  });

  it("reads a settled reference as up to date", () => {
    const s = stepStates(
      input({ summary: summaryOf({ documentCount: 2, document: doc("ready") }) }),
    );

    expect(s.reference).toEqual({ tone: "ready", line: { id: "referenceReady" } });
  });

  it.each([
    ["no_sections", "todo", "sectionsNone"],
    ["processing", "working", "sectionsProcessing"],
    ["published", "ready", "sectionsUpToDate"],
  ] as const)("maps priority %s onto the rubriques row", (priority, tone, id) => {
    const s = stepStates(input({ workspace: workspaceOf({ priority }) }));

    expect(s.sections.tone).toBe(tone);
    expect(s.sections.line.id).toBe(id);
  });

  it("counts what waits for review", () => {
    const s = stepStates(
      input({
        workspace: workspaceOf({ priority: "needs_action", pendingReviewCount: 2 }),
      }),
    );

    expect(s.sections).toEqual({
      tone: "todo",
      line: { id: "sectionsReview", values: { count: 2 } },
    });
  });

  it("counts the failed writes", () => {
    const s = stepStates(
      input({
        workspace: workspaceOf({
          priority: "needs_attention",
          failedOperationCount: 1,
        }),
      }),
    );

    expect(s.sections).toEqual({
      tone: "attention",
      line: { id: "sectionsFailed", values: { count: 1 } },
    });
  });

  // Found on the real screen: a failed *reference* write also counts in
  // failedOperationCount, and used to turn the rubriques row red on a project
  // with no rubrique — one failure reported twice, once in the wrong place.
  it("does not blame the rubriques for the reference's own failure", () => {
    const s = stepStates(
      input({
        summary: summaryOf({ documentCount: 1, document: doc("failed") }),
        workspace: workspaceOf({
          priority: "needs_attention",
          failedOperationCount: 1,
        }),
      }),
    );

    expect(s.reference.tone).toBe("attention");
    expect(s.sections).toEqual({ tone: "waiting", line: { id: "sectionsWaiting" } });
  });

  it("still raises a rubrique failure when there is one beyond the reference's", () => {
    const s = stepStates(
      input({
        summary: summaryOf({ documentCount: 1, document: doc("failed") }),
        workspace: workspaceOf({
          priority: "needs_attention",
          failedOperationCount: 2,
        }),
      }),
    );

    expect(s.sections.tone).toBe("attention");
    expect(s.sections.line).toEqual({ id: "sectionsFailed", values: { count: 2 } });
  });

  it("says in words when the client still reads the previous version", () => {
    const s = stepStates(
      input({
        workspace: workspaceOf({ clientVisibility: "previous_version_visible" }),
      }),
    );

    expect(s.client).toEqual({ tone: "attention", line: { id: "clientPrevious" } });
  });

  it("reads a current publication as up to date", () => {
    const s = stepStates(
      input({
        workspace: workspaceOf({ clientVisibility: "current_version_visible" }),
      }),
    );

    expect(s.client).toEqual({ tone: "ready", line: { id: "clientCurrent" } });
  });

  // FR-009, carried over from 021: a state that cannot be read is unknown,
  // never absent — an outage must not read as an empty project.
  it("reads a failed summary as unknown on the two steps it feeds", () => {
    const s = stepStates(input({ summary: undefined, summaryFailed: true }));

    expect(s.sources.tone).toBe("unknown");
    expect(s.reference.tone).toBe("unknown");
  });

  it("reads a failed workspace as unknown on the two steps it feeds", () => {
    const s = stepStates(input({ workspace: undefined, workspaceFailed: true }));

    expect(s.sections.tone).toBe("unknown");
    expect(s.client.tone).toBe("unknown");
  });
});

describe("landingStep", () => {
  it("lands an empty project on the documents", () => {
    expect(landingStep(input())).toBe("sources");
  });

  it("lands on the reference while it is not ready", () => {
    expect(
      landingStep(
        input({ summary: summaryOf({ documentCount: 1, document: doc("writing") }) }),
      ),
    ).toBe("reference");
  });

  it("lands on the rubriques once everything upstream is done", () => {
    expect(
      landingStep(
        input({ summary: summaryOf({ documentCount: 1, document: doc("ready") }) }),
      ),
    ).toBe("sections");
  });
});
