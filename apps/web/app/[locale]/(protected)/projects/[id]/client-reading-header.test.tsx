import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProjectMembers } from "@/features/projects/hooks";
import { ClientReadingHeader } from "./client-reading-header";

vi.mock("@/features/projects/hooks", () => ({ useProjectMembers: vi.fn() }));
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

const project = {
  id: "project-1",
  title: "Refonte du site vitrine",
  progressPercentage: null,
  meetingUrl: null,
  timezone: null,
  dateFormat: null,
  language: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-04T10:00:00.000Z",
};

describe("ClientReadingHeader", () => {
  it("names the project, who publishes it, and when it last moved", () => {
    vi.mocked(useProjectMembers).mockReturnValue({
      data: [
        {
          userId: "u1",
          firstName: "Jean-Charles",
          lastName: "B",
          email: "jc@example.com",
          isAdmin: true,
          accountKind: "developer",
          image: null,
          roleTitle: null,
        },
      ],
    } as unknown as ReturnType<typeof useProjectMembers>);

    render(<ClientReadingHeader project={project} backLabel="Vos projets" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Refonte du site vitrine");
    expect(screen.getByText("publishedBy")).toBeInTheDocument();
    expect(screen.getByText("updatedOn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vos projets" })).toHaveAttribute("href", "/home");
  });

  it("stays quiet about the publisher while the members are not known", () => {
    vi.mocked(useProjectMembers).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useProjectMembers>);

    render(<ClientReadingHeader project={project} backLabel="Vos projets" />);

    expect(screen.queryByText("publishedBy")).not.toBeInTheDocument();
  });
});
