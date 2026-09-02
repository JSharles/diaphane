import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useConnections } from "@/shared/hooks/use-connections";
import { NotionConnectionCard } from "./notion-connection-card";

vi.mock("@/shared/hooks/use-connections", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks/use-connections")>()),
  useConnections: vi.fn(),
}));

vi.mock("@/shared/components/notion-connect-error", () => ({
  NotionConnectError: () => <div>notion-connect-error</div>,
}));

const CONNECT_HREF =
  "http://localhost:3001/connections/notion?locale=fr&returnTo=%2Fprojects%2Fproject-1";

function notion(
  state: { connected: boolean; needsReconnect: boolean; workspaceName: string | null } | undefined,
  isPending = false,
) {
  vi.mocked(useConnections).mockReturnValue({
    data: state ? { github: { connected: true, needsReconnect: false }, notion: state } : undefined,
    isPending,
  } as unknown as ReturnType<typeof useConnections>);
}

describe("NotionConnectionCard", () => {
  it("shows a skeleton and no button while pending", () => {
    notion(undefined, true);

    const { container } = render(<NotionConnectionCard projectId="project-1" />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("offers « Connecter Notion », coming back to this project, when the developer is not connected", () => {
    notion({ connected: false, needsReconnect: false, workspaceName: null });

    render(<NotionConnectionCard projectId="project-1" />);

    expect(screen.getByText("notConnected")).toBeInTheDocument();
    expect(screen.getByText("state_waiting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "connect" })).toHaveAttribute("href", CONNECT_HREF);
    expect(screen.getByText("notion-connect-error")).toBeInTheDocument();
  });

  it("names the workspace and offers the same button to tick more pages when connected", () => {
    notion({ connected: true, needsReconnect: false, workspaceName: "Acme" });

    render(<NotionConnectionCard projectId="project-1" />);

    expect(screen.getByText("connectedTo")).toBeInTheDocument();
    expect(screen.getByText("state_live")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "choosePages" })).toHaveAttribute("href", CONNECT_HREF);
    expect(screen.queryByRole("button", { name: /disconnect/ })).not.toBeInTheDocument();
  });

  it("falls back to a plain connected line without a workspace name", () => {
    notion({ connected: true, needsReconnect: false, workspaceName: null });

    render(<NotionConnectionCard projectId="project-1" />);

    expect(screen.getByText("connected")).toBeInTheDocument();
  });

  it("says Notion refused the refresh and offers to reconnect", () => {
    notion({ connected: true, needsReconnect: true, workspaceName: "Acme" });

    render(<NotionConnectionCard projectId="project-1" />);

    expect(screen.getByText("needsReconnect")).toBeInTheDocument();
    expect(screen.getByText("state_unknown")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "reconnect" })).toHaveAttribute("href", CONNECT_HREF);
  });
});
