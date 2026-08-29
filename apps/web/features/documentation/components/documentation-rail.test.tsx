import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentationWorkspace, useReferenceSummary } from "../hooks";
import { DocumentationRail } from "./documentation-rail";

vi.mock("../hooks", () => ({
  useReferenceSummary: vi.fn(),
  useDocumentationWorkspace: vi.fn(),
}));

let currentPath = "/projects/project-1/documentation/sources";
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => currentPath,
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function withData({
  summary = { documentCount: 0, openPointCount: 0, needsRewrite: false, document: null },
  workspace = { priority: "empty", clientVisibility: "nothing_published" },
  pending = false,
}: {
  summary?: unknown;
  workspace?: unknown;
  pending?: boolean;
} = {}) {
  vi.mocked(useReferenceSummary).mockReturnValue({
    data: summary,
    isPending: pending,
    isError: false,
  } as unknown as ReturnType<typeof useReferenceSummary>);
  vi.mocked(useDocumentationWorkspace).mockReturnValue({
    data: workspace,
    isPending: pending,
    isError: false,
  } as unknown as ReturnType<typeof useDocumentationWorkspace>);
}

describe("DocumentationRail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPath = "/projects/project-1/documentation/sources";
  });

  // The numbers never move (FR-003): four rows, 1 to 4, whatever the state.
  it("shows the four steps, numbered and named, each leading to its place", () => {
    withData();

    render(<DocumentationRail projectId="project-1" />);

    for (const n of ["1", "2", "3", "4"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /name_sources/ })).toHaveAttribute(
      "href",
      "/projects/project-1/documentation/sources",
    );
    expect(screen.getByRole("link", { name: /name_client/ })).toHaveAttribute(
      "href",
      "/projects/project-1/documentation/client",
    );
  });

  it("marks the step the pathname is standing in", () => {
    currentPath = "/projects/project-1/documentation/reference";
    withData();

    render(<DocumentationRail projectId="project-1" />);

    expect(screen.getByRole("link", { name: /name_reference/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: /name_sources/ }),
    ).not.toHaveAttribute("aria-current");
  });

  // A document's own sub-page belongs to step 1 and keeps its row active.
  it("keeps step 1 active on a single document's page", () => {
    currentPath = "/projects/project-1/documentation/sources/doc-9";
    withData();

    render(<DocumentationRail projectId="project-1" />);

    expect(screen.getByRole("link", { name: /name_sources/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("carries each step's state line", () => {
    withData({
      summary: {
        documentCount: 3,
        openPointCount: 2,
        needsRewrite: false,
        document: { status: "ready" },
      },
      workspace: {
        priority: "needs_action",
        pendingReviewCount: 1,
        clientVisibility: "previous_version_visible",
      },
    });

    render(<DocumentationRail projectId="project-1" />);

    expect(screen.getByText("sourcesCount")).toBeInTheDocument();
    expect(screen.getByText("referencePoints")).toBeInTheDocument();
    expect(screen.getByText("sectionsReview")).toBeInTheDocument();
    expect(screen.getByText("clientPrevious")).toBeInTheDocument();
  });

  it("shows placeholders rather than wrong states while loading", () => {
    withData({ pending: true });

    const { container } = render(<DocumentationRail projectId="project-1" />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(4);
    expect(screen.queryByText("sourcesEmpty")).not.toBeInTheDocument();
  });
});
