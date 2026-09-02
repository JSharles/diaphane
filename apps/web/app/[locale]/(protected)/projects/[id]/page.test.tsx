import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useProject } from "@/features/projects/hooks";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import ProjectPage from "./page";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, use: (value: unknown) => value };
});

vi.mock("@/features/projects/hooks", () => ({
  useProject: vi.fn(),
}));
vi.mock("@/shared/hooks/use-current-user", () => ({
  useCurrentUser: vi.fn(),
}));

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
}));

vi.mock("@/features/projects/components/team-summary-card", () => ({
  TeamSummaryCard: ({ projectId }: { projectId: string }) => (
    <div>team-summary-card:{projectId}</div>
  ),
}));

vi.mock("@/features/projects/components/team-panel", () => ({
  TeamPanel: ({ projectId }: { projectId: string }) => <div>team-panel:{projectId}</div>,
}));

vi.mock("@/features/documentation/components/documentary-source-row", () => ({
  DocumentarySourceRow: ({ projectId }: { projectId: string }) => (
    <div>documentary-source:{projectId}</div>
  ),
}));
vi.mock("@/features/documentation/components/documentation-summary-card", () => ({
  DocumentationSummaryCard: ({ projectId }: { projectId: string }) => (
    <div>documentation-summary:{projectId}</div>
  ),
}));

vi.mock("@/features/board-connections/components/board-connection-card", () => ({
  BoardConnectionCard: ({ projectId }: { projectId: string }) => (
    <div>board-connection-card:{projectId}</div>
  ),
}));

vi.mock("@/features/notion-connection/components/notion-connection-card", () => ({
  NotionConnectionCard: ({ projectId }: { projectId: string }) => (
    <div>notion-connection-card:{projectId}</div>
  ),
}));

vi.mock("@/features/projects/components/meeting-link-card", () => ({
  MeetingLinkCard: ({ projectId }: { projectId: string }) => (
    <div>meeting-link-card:{projectId}</div>
  ),
}));

vi.mock("@/features/projects/components/meeting-card", () => ({
  MeetingCard: ({ projectId }: { projectId: string }) => <div>meeting-card:{projectId}</div>,
}));

vi.mock("@/features/projects/components/project-preferences", () => ({
  ProjectPreferences: ({ projectId }: { projectId: string }) => (
    <div>project-preferences:{projectId}</div>
  ),
}));

vi.mock("./client-main-tabs", () => ({
  ClientMainTabs: ({ projectId }: { projectId: string }) => (
    <div>client-main-tabs:{projectId}</div>
  ),
}));

const mockedUseProject = vi.mocked(useProject);
const mockedUseCurrentUser = vi.mocked(useCurrentUser);

// What the page shows comes from the account: a developer tends, a client reads.
function mockAccount(accountKind: "developer" | "client") {
  mockedUseCurrentUser.mockReturnValue({
    data: { id: "user-1", accountKind },
    isPending: false,
  } as unknown as ReturnType<typeof useCurrentUser>);
}

function renderPage() {
  return render(
    <ProjectPage params={{ id: "project-1" } as unknown as Promise<{ id: string }>} />,
  );
}

function mockProject(role: "contributor" | "client", isAdmin: boolean) {
  mockAccount(role === "contributor" ? "developer" : "client");
  mockedUseProject.mockReturnValue({
    data: { id: "project-1", title: "Site vitrine client X", isAdmin },
    isPending: false,
  } as unknown as ReturnType<typeof useProject>);
}

describe("ProjectPage", () => {
  it("shows a contributor admin what the client receives, plus access", () => {
    mockProject("contributor", true);

    renderPage();

    expect(screen.getByText("Site vitrine client X")).toBeInTheDocument();
    expect(screen.getByText("documentation-summary:project-1")).toBeInTheDocument();
    expect(screen.getByText("team-summary-card:project-1")).toBeInTheDocument();
    expect(screen.queryByText("client-main-tabs:project-1")).not.toBeInTheDocument();
  });

  // 2026-08-29, after specs/022: the documents live in the documentation and
  // the remaining connections came back to the foot of this page — the setup
  // route was more address than content. The documentary-source mock is a
  // tripwire: that component is deleted, and if a documents block is ever
  // reintroduced here its marker renders and this fails loudly.
  it("holds the connections at the foot, and no documents block", () => {
    mockProject("contributor", true);

    renderPage();

    expect(screen.getByText("notion-connection-card:project-1")).toBeInTheDocument();
    expect(screen.getByText("board-connection-card:project-1")).toBeInTheDocument();
    expect(screen.getByText("meeting-link-card:project-1")).toBeInTheDocument();
    expect(screen.getByText("project-preferences:project-1")).toBeInTheDocument();
    expect(screen.queryByText("documentary-source:project-1")).not.toBeInTheDocument();
  });

  // The only orientation on arrival used to be the title itself: no crumb, no
  // way back to the list the project was opened from.
  it.each(["contributor", "client"] as const)(
    "offers a %s the way back to their project list",
    (role) => {
      mockProject(role, false);

      renderPage();

      expect(screen.getByRole("link", { name: "backToProjects" })).toHaveAttribute(
        "href",
        "/home",
      );
    },
  );

  it("shows no join-meeting shortcut when the project has no meeting link", () => {
    mockProject("contributor", true);

    renderPage();

    expect(screen.queryByRole("link", { name: "joinMeeting" })).not.toBeInTheDocument();
  });

  it("shows a join-meeting shortcut next to the title when a meeting link is set, for a contributor", () => {
    mockAccount("developer");
    mockedUseProject.mockReturnValue({
      data: {
        id: "project-1",
        title: "Site vitrine client X",
        isAdmin: true,
        meetingUrl: "https://meet.google.com/abc-defg-hij",
      },
      isPending: false,
    } as unknown as ReturnType<typeof useProject>);

    renderPage();

    expect(screen.getByRole("link", { name: "joinMeeting" })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc-defg-hij",
    );
  });

  it("hides the header join-meeting shortcut for a client — MeetingCard already shows one prominently in the sidebar", () => {
    mockAccount("client");
    mockedUseProject.mockReturnValue({
      data: {
        id: "project-1",
        title: "Site vitrine client X",
        isAdmin: false,
        meetingUrl: "https://meet.google.com/abc-defg-hij",
      },
      isPending: false,
    } as unknown as ReturnType<typeof useProject>);

    renderPage();

    expect(screen.queryByRole("link", { name: "joinMeeting" })).not.toBeInTheDocument();
  });

  it("shows the same sections to a non-admin contributor", () => {
    mockProject("contributor", false);

    renderPage();

    expect(screen.getByText("documentation-summary:project-1")).toBeInTheDocument();
    expect(screen.getByText("team-summary-card:project-1")).toBeInTheDocument();
    expect(screen.getByText("board-connection-card:project-1")).toBeInTheDocument();
  });

  // The order is the hierarchy: the work, then access, then the wiring.
  it("puts the work first and the wiring at the foot", () => {
    mockProject("contributor", true);

    renderPage();

    const labels = [
      "documentation-summary:project-1",
      "team-summary-card:project-1",
      "connections",
      "notion-connection-card:project-1",
      "board-connection-card:project-1",
      "meeting-link-card:project-1",
      "preferences",
      "project-preferences:project-1",
    ];
    for (let i = 0; i < labels.length - 1; i++) {
      const current = screen.getByText(labels[i]);
      const next = screen.getByText(labels[i + 1]);
      expect(
        current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("shows only the read-only client view for a non-admin client", () => {
    mockProject("client", false);

    renderPage();

    expect(screen.queryByText("team-summary-card:project-1")).not.toBeInTheDocument();
    expect(screen.queryByText("documentation-summary:project-1")).not.toBeInTheDocument();
    expect(screen.queryByText("board-connection-card:project-1")).not.toBeInTheDocument();
    expect(screen.queryByText("notion-connection-card:project-1")).not.toBeInTheDocument();
    expect(screen.queryByText("meeting-link-card:project-1")).not.toBeInTheDocument();

    expect(screen.getByText("team-panel:project-1")).toBeInTheDocument();
    expect(screen.getByText("meeting-card:project-1")).toBeInTheDocument();
    expect(screen.getByText("client-main-tabs:project-1")).toBeInTheDocument();
  });

  it("gives an admin client the same read-only project view as any client", () => {
    mockProject("client", true);

    renderPage();

    expect(screen.queryByText("team-summary-card:project-1")).not.toBeInTheDocument();
    expect(screen.queryByText("documentation-summary:project-1")).not.toBeInTheDocument();
    expect(screen.getByText("team-panel:project-1")).toBeInTheDocument();
    expect(screen.getByText("client-main-tabs:project-1")).toBeInTheDocument();
  });

  it("shows no form control anywhere among the client placeholders", () => {
    mockProject("client", false);

    renderPage();

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
  });

  it("shows an explicit error state with a retry action when the project is missing", () => {
    mockedUseProject.mockReturnValue({
      data: undefined,
      isPending: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProject>);

    renderPage();

    expect(screen.getByText("loadErrorTitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "loadErrorRetry" })).toBeInTheDocument();
  });

  it("shows the error state, not a stale project from a prior session, when the query errors", () => {
    mockAccount("developer");
    mockedUseProject.mockReturnValue({
      data: { id: "project-1", title: "Someone else's project", isAdmin: true },
      isPending: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProject>);

    renderPage();

    expect(screen.queryByText("Someone else's project")).not.toBeInTheDocument();
    expect(screen.getByText("loadErrorTitle")).toBeInTheDocument();
  });

  it("calls refetch when the retry button is clicked", async () => {
    const refetch = vi.fn();
    mockedUseProject.mockReturnValue({
      data: undefined,
      isPending: false,
      refetch,
    } as unknown as ReturnType<typeof useProject>);
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole("button", { name: "loadErrorRetry" }));

    expect(refetch).toHaveBeenCalled();
  });
});
