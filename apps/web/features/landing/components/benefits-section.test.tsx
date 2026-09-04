import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BenefitsSection } from "./benefits-section";

describe("BenefitsSection", () => {
  it("renders both tracks with their three benefits each, and the client view on the client track", () => {
    render(<BenefitsSection />);

    expect(screen.getByText("projectTitle")).toBeInTheDocument();
    expect(screen.getAllByText("eyebrow")).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
    expect(screen.getAllByText("card1Title")).toHaveLength(2);
    expect(screen.getAllByText("card2Title")).toHaveLength(2);
    expect(screen.getAllByText("card3Title")).toHaveLength(2);
  });
});
