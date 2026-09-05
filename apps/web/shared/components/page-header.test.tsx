import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "./page-header";

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

describe("PageHeader", () => {
  it("renders the title as the page's h1, the way back, and the action on the title line", () => {
    render(
      <PageHeader
        backHref="/home"
        backLabel="Vos projets"
        title="Refonte du site"
        action={<button type="button">Inviter</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Refonte du site");
    expect(screen.getByRole("link", { name: "Vos projets" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("button", { name: "Inviter" })).toBeInTheDocument();
  });

  it("renders no breadcrumb when there is nowhere back to go", () => {
    render(<PageHeader title="Vos projets" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
