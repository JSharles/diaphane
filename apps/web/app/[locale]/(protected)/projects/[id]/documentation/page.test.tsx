import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReferenceSummary } from "@/features/documentation/hooks";
import DocumentationRootPage from "./page";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, use: (value: unknown) => value };
});

vi.mock("@/features/documentation/hooks", () => ({
  useReferenceSummary: vi.fn(),
}));

const replace = vi.fn();
const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

function withSummary(data: unknown, isPending = false) {
  vi.mocked(useReferenceSummary).mockReturnValue({
    data,
    isPending,
    isError: false,
  } as unknown as ReturnType<typeof useReferenceSummary>);
}

function renderRoot() {
  return render(
    <DocumentationRootPage
      params={{ id: "project-1" } as unknown as Promise<{ id: string }>}
    />,
  );
}

describe("DocumentationRootPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lands an empty project on the documents", () => {
    withSummary({ documentCount: 0, document: null });

    renderRoot();

    expect(replace).toHaveBeenCalledWith("/projects/project-1/documentation/sources");
  });

  it("lands on the reference while it is not ready", () => {
    withSummary({ documentCount: 2, document: { status: "writing" } });

    renderRoot();

    expect(replace).toHaveBeenCalledWith(
      "/projects/project-1/documentation/reference",
    );
  });

  it("lands on the rubriques once everything upstream is done", () => {
    withSummary({ documentCount: 2, document: { status: "ready" } });

    renderRoot();

    expect(replace).toHaveBeenCalledWith(
      "/projects/project-1/documentation/sections",
    );
  });

  // replace, never push: the back button must not return to an empty root.
  it("replaces instead of pushing, and waits for the data before moving", () => {
    withSummary(undefined, true);

    renderRoot();

    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
