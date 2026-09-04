import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";

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

describe("Hero", () => {
  it("renders the promise, one call to action, the facts line, and the ticket before/after as proof", () => {
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("titleBeforetitleHighlighttitleAfter");
    expect(within(heading).getByText("titleHighlight")).toBeInTheDocument();
    expect(screen.getByText("eyebrow")).toBeInTheDocument();
    expect(screen.getByText("subhead")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "primaryCta" })).toHaveAttribute("href", "/signup");
    expect(screen.getByText("facts")).toBeInTheDocument();
    // The proof: the ticket example is in the first viewport.
    expect(screen.getByText("badge")).toBeInTheDocument();
    expect(screen.getByText("clientTitle")).toBeInTheDocument();
  });
});
