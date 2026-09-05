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
    expect(layer.className).toContain("lg:left-[42%]");
    expect(layer.className).toContain("lg:right-0");
    expect(layer.className).toContain(
      "lg:[mask-image:linear-gradient(to_right,transparent_0%,black_12%,black_100%)]",
    );

    const artwork = layer.firstElementChild as HTMLElement;
    expect(artwork.className).toContain("w-full");

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("width", "1366");
    expect(image).toHaveAttribute("height", "768");
    expect(image?.className).toContain("opacity-100");
    expect(image?.className).not.toContain("opacity-40");
  });
});
