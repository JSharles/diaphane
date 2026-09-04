import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-client";
import { useAvailableBoards, useConnectBoard } from "../hooks";
import { ConnectBoardDialog } from "./connect-board-dialog";

vi.mock("../hooks", () => ({
  useAvailableBoards: vi.fn(),
  useConnectBoard: vi.fn(),
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

const mockedUseAvailableBoards = vi.mocked(useAvailableBoards);
const mockedUseConnect = vi.mocked(useConnectBoard);

const fakeBoard = {
  ownerLogin: "acme",
  ownerType: "Organization" as const,
  number: 3,
  title: "Roadmap",
  url: "https://github.com/orgs/acme/projects/3",
};

function boards(overrides: Record<string, unknown>) {
  mockedUseAvailableBoards.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useAvailableBoards>);
}

function stubConnect(overrides: Record<string, unknown> = {}) {
  const mutate = vi.fn();
  mockedUseConnect.mockReturnValue({
    mutate,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useConnectBoard>);
  return mutate;
}

describe("ConnectBoardDialog", () => {
  beforeEach(() => {
    stubConnect();
  });

  it("fetches the boards only while open", () => {
    boards({ data: [] });

    render(<ConnectBoardDialog projectId="project-1" open={false} onOpenChange={() => {}} />);

    expect(mockedUseAvailableBoards).toHaveBeenCalledWith("project-1", { enabled: false });
  });

  it("shows a loading line while the boards are fetched, and no GitHub link anywhere", () => {
    boards({ isPending: true });

    render(<ConnectBoardDialog projectId="project-1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("sends a developer without a GitHub connection to their profile", () => {
    boards({
      isError: true,
      error: new ApiError("Connect GitHub from your profile first.", 400, "GITHUB_NOT_CONNECTED"),
    });

    render(<ConnectBoardDialog projectId="project-1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("githubNotConnected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "goToProfile" })).toHaveAttribute("href", "/profile");
  });

  it("shows the API's own message for any other failure, still with the way to the profile", () => {
    boards({ isError: true, error: new ApiError("GitHub is unreachable", 400) });

    render(<ConnectBoardDialog projectId="project-1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("GitHub is unreachable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "goToProfile" })).toBeInTheDocument();
  });

  it("says so when the connection sees no board", () => {
    boards({ data: [] });

    render(<ConnectBoardDialog projectId="project-1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("noBoards")).toBeInTheDocument();
  });

  it("connects the selected board with the chosen estimate unit, then closes", async () => {
    boards({ data: [fakeBoard] });
    const onOpenChange = vi.fn();
    const mutate = stubConnect();
    const user = userEvent.setup();

    render(<ConnectBoardDialog projectId="project-1" open={true} onOpenChange={onOpenChange} />);

    const submit = screen.getByRole("button", { name: "connectSubmit" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /acme \/ Roadmap/ }));
    await user.click(submit);

    expect(mutate).toHaveBeenCalledWith(
      { ownerLogin: "acme", ownerType: "Organization", number: 3 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const options = mutate.mock.calls[0][1] as { onSuccess: () => void };
    options.onSuccess();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows the connect error inline", () => {
    boards({ data: [fakeBoard] });
    stubConnect({ isError: true, error: new ApiError("No access to this board", 403) });

    render(<ConnectBoardDialog projectId="project-1" open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("No access to this board")).toBeInTheDocument();
  });
});
