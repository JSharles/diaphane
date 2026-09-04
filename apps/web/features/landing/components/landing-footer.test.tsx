import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LandingFooter } from "./landing-footer";

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

describe("LandingFooter", () => {
  it("renders the brand statement, the launch status, and a door for an invited client", () => {
    render(<LandingFooter />);

    expect(screen.getByText("Diaphane")).toBeInTheDocument();
    expect(screen.getByText("statement")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByText(/invitedHint/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "invitedLogin" })).toHaveAttribute("href", "/login");
  });
});
