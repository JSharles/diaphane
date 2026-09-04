import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroIllustration } from "./hero-illustration";

// The stub stands in for next/image itself, so it renders the very element
// the rule steers away from; the component under test uses the real one.
/* eslint-disable @next/next/no-img-element */
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt} />,
}));
/* eslint-enable @next/next/no-img-element */

describe("HeroIllustration", () => {
  it("renders a decorative layer behind the content, inert to the pointer", () => {
    const { container } = render(<HeroIllustration />);
    const layer = container.firstElementChild as HTMLElement;

    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.className).toContain("-z-10");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
