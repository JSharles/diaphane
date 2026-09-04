import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDocumentationDocuments, useReferenceSummary } from "../hooks";
import { useProject } from "@/features/projects/hooks";
import { DocumentarySourcesPage } from "./documentary-sources-page";

vi.mock("../hooks", () => ({
  useDocumentationDocuments: vi.fn(),
  useReferenceSummary: vi.fn(),
}));
vi.mock("@/features/projects/hooks", () => ({ useProject: vi.fn() }));
vi.mock("./reference-document-view", () => ({
  ReferenceDocumentView: () => <div>reference-document</div>,
}));
vi.mock("./add-document-dialog", () => ({
  AddDocumentDialog: ({ open }: { open: boolean }) =>
    open ? <div>add-document-dialog</div> : null,
}));
vi.mock("./remove-document-dialog", () => ({
  RemoveDocumentDialog: ({ open }: { open: boolean }) =>
    open ? <div>remove-document-dialog</div> : null,
}));

const replace = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace }),
}));

function withSummary(data: Record<string, unknown>) {
  vi.mocked(useReferenceSummary).mockReturnValue({
    data,
    isPending: false,
    isError: false,
  } as never);
}

describe("DocumentarySourcesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProject).mockReturnValue({
      data: { role: "contributor" },
      isPending: false,
      isError: false,
    } as never);
    vi.mocked(useDocumentationDocuments).mockReturnValue({
      data: {
        items: [
          { id: "d1", title: "Cahier des charges", status: "incorporated" },
        ],
        total: 1,
      },
      isPending: false,
      isError: false,
    } as never);
    withSummary({ documentCount: 1, document: { status: "ready" } });
  });

  // The reference document has its own step now. This page is the
  // document list and add/remove, nothing else — the mocked ReferenceDocumentView
  // above stays declared as a tripwire: if it is imported here again, its
  // marker text renders and the absence assertion fails loudly.
  it("holds the document list, and no longer the document written from it", () => {
    render(<DocumentarySourcesPage projectId="project-1" />);

    expect(screen.getByText("Cahier des charges")).toBeVisible();
    expect(screen.queryByText("reference-document")).not.toBeInTheDocument();
  });

  it("opens addition and removal from the same page", () => {
    render(<DocumentarySourcesPage projectId="project-1" />);

    fireEvent.click(screen.getByRole("button", { name: "add" }));
    expect(screen.getByText("add-document-dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "remove" }));
    expect(screen.getByText("remove-document-dialog")).toBeVisible();
  });

  it("invites a first document when the base is empty", () => {
    vi.mocked(useDocumentationDocuments).mockReturnValue({
      data: { items: [], total: 0 },
      isPending: false,
      isError: false,
    } as never);
    withSummary({ documentCount: 0, document: null });

    render(<DocumentarySourcesPage projectId="project-1" />);

    expect(screen.getByText("emptyTitle")).toBeVisible();
  });

  // The rail carries the way onward now; a footer link here would be a second
  // navigation for the same move.
  it("carries no navigation of its own", () => {
    render(<DocumentarySourcesPage projectId="project-1" />);

    expect(
      screen.queryByRole("link", { name: /toClientContent/ }),
    ).not.toBeInTheDocument();
  });

  // A failed request is not an empty base.
  it("says the documents failed to load rather than showing none", () => {
    vi.mocked(useDocumentationDocuments).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as never);

    render(<DocumentarySourcesPage projectId="project-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("documentsLoadError");
    expect(screen.queryByText("emptyTitle")).not.toBeInTheDocument();
  });

  // The contributor gate moved to the documentation layout —
  // covered in layout.test.tsx; the API refuses independently either way.
});
