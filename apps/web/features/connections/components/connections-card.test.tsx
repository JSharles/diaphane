import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "@/shared/hooks/use-connections";
import { ApiError } from "@/shared/lib/api-client";
import { useDisconnectGithub, useDisconnectNotion } from "../hooks";
import { ConnectionsCard } from "./connections-card";

vi.mock("@/shared/hooks/use-connections", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/hooks/use-connections")>()),
  useConnections: vi.fn(),
}));

vi.mock("../hooks", () => ({
  useDisconnectGithub: vi.fn(),
  useDisconnectNotion: vi.fn(),
}));

vi.mock("@/shared/components/notion-connect-error", () => ({
  NotionConnectError: () => <div>notion-connect-error</div>,
}));

const mockedUseConnections = vi.mocked(useConnections);

type Github = { connected: boolean; needsReconnect: boolean };
type Notion = Github & { workspaceName: string | null };

const NOTION_OFF: Notion = { connected: false, needsReconnect: false, workspaceName: null };
const GITHUB_ON: Github = { connected: true, needsReconnect: false };

function connections(state: { github: Github; notion: Notion } | undefined, isPending = false) {
  mockedUseConnections.mockReturnValue({
    data: state,
    isPending,
  } as unknown as ReturnType<typeof useConnections>);
}

function stubDisconnect(
  hook: typeof useDisconnectGithub | typeof useDisconnectNotion,
  overrides: Record<string, unknown> = {},
) {
  const mutate = vi.fn();
  vi.mocked(hook).mockReturnValue({
    mutate,
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useDisconnectGithub>);
  return mutate;
}

describe("ConnectionsCard", () => {
  beforeEach(() => {
    stubDisconnect(useDisconnectGithub);
    stubDisconnect(useDisconnectNotion);
  });

  it("shows skeletons while pending", () => {
    connections(undefined, true);

    const { container } = render(<ConnectionsCard />);

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
  });

  describe("GitHub", () => {
    it("offers the login link to connect GitHub when it is not connected", () => {
      connections({ github: { connected: false, needsReconnect: false }, notion: NOTION_OFF });

      render(<ConnectionsCard />);

      expect(screen.getByText("githubNotConnected")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "connect" })).toHaveAttribute(
        "href",
        "http://localhost:3001/auth/github?locale=fr",
      );
      expect(screen.queryByRole("button", { name: "disconnect" })).not.toBeInTheDocument();
    });

    it("shows connected with a way to disconnect", async () => {
      connections({ github: GITHUB_ON, notion: NOTION_OFF });
      const mutate = stubDisconnect(useDisconnectGithub);
      const user = userEvent.setup();

      render(<ConnectionsCard />);

      expect(screen.getByText("githubConnected")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "disconnect" }));
      expect(mutate).toHaveBeenCalled();
    });

    it("says revoked and offers the login link again when GitHub revoked the token", () => {
      connections({ github: { connected: true, needsReconnect: true }, notion: NOTION_OFF });

      render(<ConnectionsCard />);

      expect(screen.getByText("githubNeedsReconnect")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "reconnect" })).toHaveAttribute(
        "href",
        "http://localhost:3001/auth/github?locale=fr",
      );
    });

    it("shows the disconnect error inline", () => {
      connections({ github: GITHUB_ON, notion: NOTION_OFF });
      stubDisconnect(useDisconnectGithub, {
        isError: true,
        error: new ApiError("Could not disconnect", 500),
      });

      render(<ConnectionsCard />);

      expect(screen.getByText("Could not disconnect")).toBeInTheDocument();
    });
  });

  describe("Notion", () => {
    it("offers the « Connecter Notion » link, coming back to the profile, when not connected", () => {
      connections({ github: GITHUB_ON, notion: NOTION_OFF });

      render(<ConnectionsCard />);

      expect(screen.getByText("notionNotConnected")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "connectNotion" })).toHaveAttribute(
        "href",
        "http://localhost:3001/connections/notion?locale=fr&returnTo=%2Fprofile",
      );
      expect(screen.getByText("notion-connect-error")).toBeInTheDocument();
    });

    it("names the workspace and offers to disconnect when connected", async () => {
      connections({
        github: GITHUB_ON,
        notion: { connected: true, needsReconnect: false, workspaceName: "Acme" },
      });
      const mutate = stubDisconnect(useDisconnectNotion);
      const user = userEvent.setup();

      render(<ConnectionsCard />);

      expect(screen.getByText("notionConnectedTo")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "connectNotion" })).not.toBeInTheDocument();
      const [, notionDisconnect] = screen.getAllByRole("button", { name: "disconnect" });
      await user.click(notionDisconnect);
      expect(mutate).toHaveBeenCalled();
    });

    it("falls back to a plain connected line when Notion gave no workspace name", () => {
      connections({
        github: GITHUB_ON,
        notion: { connected: true, needsReconnect: false, workspaceName: null },
      });

      render(<ConnectionsCard />);

      expect(screen.getByText("notionConnected")).toBeInTheDocument();
    });

    it("says Notion refused the refresh and offers the same link to reconnect", () => {
      connections({
        github: GITHUB_ON,
        notion: { connected: true, needsReconnect: true, workspaceName: "Acme" },
      });

      render(<ConnectionsCard />);

      expect(screen.getByText("notionNeedsReconnect")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "reconnect" })).toHaveAttribute(
        "href",
        "http://localhost:3001/connections/notion?locale=fr&returnTo=%2Fprofile",
      );
    });
  });
});
