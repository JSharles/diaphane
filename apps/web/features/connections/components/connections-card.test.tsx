import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-client";
import { useConnections, useDisconnectGithub } from "../hooks";
import { ConnectionsCard } from "./connections-card";

vi.mock("../hooks", () => ({
  useConnections: vi.fn(),
  useDisconnectGithub: vi.fn(),
}));

const mockedUseConnections = vi.mocked(useConnections);
const mockedUseDisconnect = vi.mocked(useDisconnectGithub);

function github(state: { connected: boolean; needsReconnect: boolean } | undefined, isPending = false) {
  mockedUseConnections.mockReturnValue({
    data: state ? { github: state } : undefined,
    isPending,
  } as unknown as ReturnType<typeof useConnections>);
}

function stubDisconnect(overrides: Record<string, unknown> = {}) {
  const mutate = vi.fn();
  mockedUseDisconnect.mockReturnValue({
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
    stubDisconnect();
  });

  it("shows a skeleton while pending", () => {
    github(undefined, true);

    const { container } = render(<ConnectionsCard />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("offers the login link to connect GitHub when it is not connected", () => {
    github({ connected: false, needsReconnect: false });

    render(<ConnectionsCard />);

    expect(screen.getByText("githubNotConnected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "connect" })).toHaveAttribute(
      "href",
      "http://localhost:3001/auth/github?locale=fr",
    );
    expect(screen.queryByRole("button", { name: "disconnect" })).not.toBeInTheDocument();
  });

  it("shows connected with a way to disconnect", async () => {
    github({ connected: true, needsReconnect: false });
    const mutate = stubDisconnect();
    const user = userEvent.setup();

    render(<ConnectionsCard />);

    expect(screen.getByText("githubConnected")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "disconnect" }));
    expect(mutate).toHaveBeenCalled();
  });

  it("says revoked and offers the login link again when GitHub revoked the token", () => {
    github({ connected: true, needsReconnect: true });

    render(<ConnectionsCard />);

    expect(screen.getByText("githubNeedsReconnect")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "reconnect" })).toHaveAttribute(
      "href",
      "http://localhost:3001/auth/github?locale=fr",
    );
    expect(screen.getByRole("button", { name: "disconnect" })).toBeInTheDocument();
  });

  it("shows the disconnect error inline", () => {
    github({ connected: true, needsReconnect: false });
    stubDisconnect({ isError: true, error: new ApiError("Could not disconnect", 500) });

    render(<ConnectionsCard />);

    expect(screen.getByText("Could not disconnect")).toBeInTheDocument();
  });
});
