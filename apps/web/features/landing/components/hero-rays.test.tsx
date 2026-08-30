import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroRays } from "./hero-rays";

// The vendored WebGL component cannot run in jsdom (no WebGL, no
// IntersectionObserver) — the wrapper's contract is what we own and test.
vi.mock("@/shared/components/SideRays", () => ({
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="side-rays"
      data-origin={String(props.origin)}
      data-color1={String(props.rayColor1)}
      data-color2={String(props.rayColor2)}
    />
  ),
}));

describe("HeroRays", () => {
  it("renders a decorative layer: hidden from AT, inert to the pointer, gone under reduced motion", () => {
    const { container } = render(<HeroRays />);
    const layer = container.firstElementChild as HTMLElement;
    expect(layer).toHaveAttribute("aria-hidden");
    expect(layer.className).toContain("pointer-events-none");
    expect(layer.className).toContain("motion-reduce:hidden");
    expect(layer.className).toContain("-z-10");
  });

  it("cascades from the top-left corner in phosphor tones only", () => {
    const { getByTestId } = render(<HeroRays />);
    const rays = getByTestId("side-rays");
    expect(rays.dataset.origin).toBe("top-left");
    expect(rays.dataset.color1).toBe("#C8EBFD");
    expect(rays.dataset.color2).toBe("#8FB4E3");
  });
});
