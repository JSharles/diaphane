import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { NavBar } from "./nav-bar";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NavBar", () => {
  it("renders the section anchors and the auth links", () => {
    render(<NavBar />);

    expect(screen.getByRole("link", { name: "nav.product" })).toHaveAttribute(
      "href",
      "#product",
    );
    expect(
      screen.getByRole("link", { name: "nav.howItWorks" }),
    ).toHaveAttribute("href", "#how-it-works");
    expect(screen.getByRole("link", { name: "nav.benefits" })).toHaveAttribute(
      "href",
      "#benefits",
    );
    expect(screen.getByRole("link", { name: "faq.navLabel" })).toHaveAttribute(
      "href",
      "#faq",
    );
    const login = screen.getByRole("link", { name: "logIn" });
    expect(login).toHaveAttribute("href", "/login");
    expect(login).toHaveAttribute("data-variant", "outline");
    expect(login).toHaveAttribute("data-size", "lg");
    expect(login).toHaveAttribute("data-typography", "marketing");
    expect(login.className).toContain("border-hairline-strong");
    expect(login.className).toContain("bg-transparent");
    expect(login.className).toContain("text-action-secondary");
    expect(login.className).not.toContain("bg-surface-2");
    expect(login.className).not.toContain("text-fg");

    const signup = screen.getByRole("link", { name: "signUp" });
    expect(signup).toHaveAttribute("href", "/signup");
    expect(signup).toHaveAttribute("data-variant", "default");
    expect(signup).toHaveAttribute("data-size", "lg");
    expect(signup).toHaveAttribute("data-typography", "marketing");
  });

  it("uses the same action hierarchy in the mobile menu", async () => {
    const user = userEvent.setup();
    render(<NavBar />);

    await user.click(screen.getByRole("button", { name: "openMenu" }));

    const login = screen.getAllByRole("link", { name: "logIn" }).at(-1);
    expect(login).toHaveAttribute("data-variant", "outline");
    expect(login).toHaveAttribute("data-size", "lg");
    expect(login).toHaveAttribute("data-typography", "marketing");
    expect(login?.className).toContain("border-hairline-strong");
    expect(login?.className).toContain("bg-transparent");
    expect(login?.className).toContain("text-action-secondary");

    const signup = screen.getAllByRole("link", { name: "signUp" }).at(-1);
    expect(signup).toHaveAttribute("data-variant", "default");
    expect(signup).toHaveAttribute("data-size", "lg");
    expect(signup).toHaveAttribute("data-typography", "marketing");
  });
});
