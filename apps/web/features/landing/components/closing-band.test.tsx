import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ClosingBand } from "./closing-band";

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

describe("ClosingBand", () => {
  it("renders the closing title and a call to action link", () => {
    render(<ClosingBand />);

    expect(screen.getByText("eyebrow")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("subhead")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "cta" });
    expect(cta).toHaveAttribute("href", "/signup");
    expect(cta).toHaveAttribute("data-variant", "default");
    expect(cta).toHaveAttribute("data-size", "lg");
    expect(cta).toHaveAttribute("data-typography", "marketing");
  });
});
