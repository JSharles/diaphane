import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useClientContentPreview } from "@/features/documentation/hooks";
import ClientStepPage from "./page";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, use: (value: unknown) => value };
});

vi.mock("@/features/documentation/hooks", () => ({
  useClientContentPreview: vi.fn(),
}));

// The mirror is the very component the client's page renders — mocked here;
// what this page owns is the frame around it.
vi.mock("../../client-main-tabs", () => ({
  ClientMainTabs: ({ projectId }: { projectId: string }) => (
    <div>client-main-tabs:{projectId}</div>
  ),
}));

function withPreview(data: unknown, pending = false) {
  vi.mocked(useClientContentPreview).mockReturnValue({
    data,
    isPending: pending,
    isError: false,
  } as unknown as ReturnType<typeof useClientContentPreview>);
}

function renderStep() {
  return render(
    <ClientStepPage params={{ id: "project-1" } as unknown as Promise<{ id: string }>} />,
  );
}

const publishedCurrent = {
  sections: [{ id: "s1" }],
  publishedAt: "2026-08-24T10:00:00.000Z",
  readySectionCount: 1,
  expectedSectionCount: 1,
};

describe("ClientStepPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the client's own screen, framed by when it went live", () => {
    withPreview({ current: publishedCurrent, pending: null });

    renderStep();

    expect(screen.getByText("client-main-tabs:project-1")).toBeInTheDocument();
    expect(screen.getByText("liveSince")).toBeInTheDocument();
  });

  // The atomic publication made legible: a newer version exists, the client
  // keeps the current one until it is complete.
  it("says a newer version is on its way without hiding the live one", () => {
    withPreview({
      current: publishedCurrent,
      pending: { readySectionCount: 1, expectedSectionCount: 3 },
    });

    renderStep();

    expect(screen.getByText("pendingNotice")).toBeInTheDocument();
    expect(screen.getByText("client-main-tabs:project-1")).toBeInTheDocument();
  });

  it("says nothing is published rather than showing an empty mirror", () => {
    withPreview({
      current: { sections: [], publishedAt: null },
      pending: null,
    });

    renderStep();

    expect(screen.getByText("nothing")).toBeInTheDocument();
    expect(screen.getByText("emptyBody")).toBeInTheDocument();
    expect(screen.queryByText("client-main-tabs:project-1")).not.toBeInTheDocument();
  });

  it("shows a placeholder while the preview loads", () => {
    withPreview(undefined, true);

    const { container } = renderStep();

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });
});
