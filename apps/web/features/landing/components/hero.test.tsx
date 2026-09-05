import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { Hero } from "./hero";

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

describe("Hero", () => {
  it("renders the product promise, primary call to action, and trust signals", () => {
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });
    const hero = heading.closest("section");

    expect(hero?.className).toContain("w-full");
    expect(hero?.className).toContain("overflow-hidden");
    expect(hero?.className).toContain("lg:items-start");
    expect(hero?.className).toContain("lg:text-left");
    expect(hero?.className).not.toContain("max-w-5xl");
    expect(heading.parentElement?.className).toContain("lg:max-w-[42vw]");
    expect(heading.parentElement?.className).toContain("lg:items-start");
    expect(heading.textContent).toBe("titleBeforetitleHighlighttitleAfter");
    expect(within(heading).getByText("titleHighlight")).toBeInTheDocument();
    expect(screen.getByText("eyebrow")).toBeInTheDocument();
    expect(screen.getByText("subhead")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "primaryCta" })).toHaveAttribute(
      "href",
      "/signup",
    );
    expect(
      screen.queryByRole("link", { name: "secondaryCta" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("trustSources")).toBeInTheDocument();
    expect(screen.getByText("trustReadOnly")).toBeInTheDocument();
    expect(screen.getByText("trustPublishing")).toBeInTheDocument();
  });
});
