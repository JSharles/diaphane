import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "@/shared/hooks/use-connections";
import { useDocumentationDocuments } from "../hooks";
import { NotionRootsCard } from "./notion-roots-card";

vi.mock("@/shared/hooks/use-connections", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks/use-connections")>()),
  useConnections: vi.fn(),
}));

vi.mock("../hooks", () => ({
  useDocumentationDocuments: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/shared/components/notion-connect-error", () => ({
  NotionConnectError: () => <div>notion-connect-error</div>,
}));

vi.mock("./notion-root-picker-dialog", () => ({
  NotionRootPickerDialog: ({ open }: { open: boolean }) => (
    <div data-testid="picker">{open ? "open" : "closed"}</div>
  ),
}));

vi.mock("./remove-document-dialog", () => ({
  RemoveDocumentDialog: ({ documentId, open }: { documentId: string | null; open: boolean }) => (
    <div data-testid="removal">{open ? `open:${documentId}` : "closed"}</div>
  ),
}));

const CONNECT_HREF =
  "http://localhost:3001/connections/notion?locale=fr&returnTo=%2Fprojects%2Fproject-1";

type Notion = { connected: boolean; needsReconnect: boolean; workspaceName: string | null };

function notion(state: Notion | undefined, isPending = false) {
  vi.mocked(useConnections).mockReturnValue({
    data: state ? { github: { connected: true, needsReconnect: false }, notion: state } : undefined,
    isPending,
  } as unknown as ReturnType<typeof useConnections>);
}

function documents(
  items: { id: string; kind: string; status: string; title: string }[],
  paging: { hasNextPage?: boolean; isFetchingNextPage?: boolean } = {},
) {
  const fetchNextPage = vi.fn();
  vi.mocked(useDocumentationDocuments).mockReturnValue({
    data: { items, total: items.length },
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage,
    ...paging,
  } as unknown as ReturnType<typeof useDocumentationDocuments>);
  return fetchNextPage;
}

const CONNECTED: Notion = { connected: true, needsReconnect: false, workspaceName: "Acme" };

describe("NotionRootsCard", () => {
  beforeEach(() => {
    documents([]);
  });

  it("shows a skeleton and no control while pending", () => {
    notion(undefined, true);

    const { container } = render(<NotionRootsCard projectId="project-1" />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "connect" })).not.toBeInTheDocument();
  });

  it("offers « Connecter Notion », coming back to this project, when the developer is not connected", () => {
    notion({ connected: false, needsReconnect: false, workspaceName: null });

    render(<NotionRootsCard projectId="project-1" />);

    expect(screen.getByText("notConnected")).toBeInTheDocument();
    expect(screen.getByText("state_waiting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "connect" })).toHaveAttribute("href", CONNECT_HREF);
    expect(screen.queryByRole("button", { name: "chooseRoots" })).not.toBeInTheDocument();
    expect(screen.getByText("notion-connect-error")).toBeInTheDocument();
  });

  it("says Notion refused the refresh and offers to reconnect", () => {
    notion({ ...CONNECTED, needsReconnect: true });

    render(<NotionRootsCard projectId="project-1" />);

    expect(screen.getByText("needsReconnect")).toBeInTheDocument();
    expect(screen.getByText("state_unknown")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "reconnect" })).toHaveAttribute("href", CONNECT_HREF);
  });

  it("connected with no racine yet: waiting, with the picker and the way to tick more pages", async () => {
    notion(CONNECTED);
    const user = userEvent.setup();

    render(<NotionRootsCard projectId="project-1" />);

    expect(screen.getByText("connectedTo")).toBeInTheDocument();
    expect(screen.getByText("noRoots")).toBeInTheDocument();
    expect(screen.getByText("state_waiting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tickMorePages" })).toHaveAttribute("href", CONNECT_HREF);
    await user.click(screen.getByRole("button", { name: "chooseRoots" }));
    expect(screen.getByTestId("picker")).toHaveTextContent("open");
  });

  it("lists the racines chosen, live, each linking to its document and removable", async () => {
    notion(CONNECTED);
    documents([
      { id: "doc-1", kind: "notion", status: "incorporated", title: "Cadrage" },
      { id: "doc-2", kind: "upload", status: "incorporated", title: "brief.pdf" },
      { id: "doc-3", kind: "notion", status: "removed", title: "Old" },
    ]);
    const user = userEvent.setup();

    render(<NotionRootsCard projectId="project-1" />);

    expect(screen.getByText("state_live")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cadrage" })).toHaveAttribute(
      "href",
      "/projects/project-1/documentation/sources/doc-1",
    );
    expect(screen.queryByText("brief.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("Old")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "removeRoot" }));
    expect(screen.getByTestId("removal")).toHaveTextContent("open:doc-1");
  });

  it("reads the document list to its end, so a racine on a later page is not missed", () => {
    notion(CONNECTED);
    const fetchNextPage = documents([], { hasNextPage: true });

    render(<NotionRootsCard projectId="project-1" />);

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("does not ask for a page it is already fetching", () => {
    notion(CONNECTED);
    const fetchNextPage = documents([], { hasNextPage: true, isFetchingNextPage: true });

    render(<NotionRootsCard projectId="project-1" />);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
