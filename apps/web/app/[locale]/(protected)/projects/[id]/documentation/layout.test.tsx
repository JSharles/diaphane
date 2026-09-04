import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProject } from "@/features/projects/hooks";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import DocumentationLayout from "./layout";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, use: (value: unknown) => value };
});

vi.mock("@/features/projects/hooks", () => ({ useProject: vi.fn() }));
vi.mock("@/shared/hooks/use-current-user", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("@/features/documentation/components/documentation-rail", () => ({
  DocumentationRail: ({ projectId }: { projectId: string }) => (
    <div>documentation-rail:{projectId}</div>
  ),
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

const mockedUseProject = vi.mocked(useProject);

function mockAccount(accountKind: "developer" | "client") {
  vi.mocked(useCurrentUser).mockReturnValue({
    data: { id: "user-1", accountKind },
    isPending: false,
  } as unknown as ReturnType<typeof useCurrentUser>);
}

function renderLayout() {
  return render(
    <DocumentationLayout
      params={{ id: "project-1" } as unknown as Promise<{ id: string }>}
    >
      <div>step-panel</div>
    </DocumentationLayout>,
  );
}

describe("DocumentationLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccount("developer");
  });

  // The rail is a layout, not a component each page remembers to include — a
  // step cannot render without it.
  it("wraps every step with the rail and the way back", () => {
    mockAccount("developer");
    mockedUseProject.mockReturnValue({
      data: { id: "project-1" },
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useProject>);

    renderLayout();

    expect(screen.getByText("documentation-rail:project-1")).toBeInTheDocument();
    expect(screen.getByText("step-panel")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "back" })).toHaveAttribute(
      "href",
      "/projects/project-1",
    );
  });

  it("sends a client away and shows them nothing", () => {
    mockAccount("client");
    mockedUseProject.mockReturnValue({
      data: { id: "project-1" },
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof useProject>);

    renderLayout();

    expect(replace).toHaveBeenCalledWith("/projects/project-1");
    expect(screen.queryByText("step-panel")).not.toBeInTheDocument();
  });

  it("offers a retry rather than a blank page when the project will not load", () => {
    const refetch = vi.fn();
    mockedUseProject.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useProject>);

    renderLayout();

    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(screen.queryByText("step-panel")).not.toBeInTheDocument();
  });
});
