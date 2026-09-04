import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturesSection } from "./features-section";

describe("FeaturesSection", () => {
  it("renders the document demonstration and three principles, without the ticket example (it lives in the hero)", () => {
    render(<FeaturesSection />);

    expect(screen.getByRole("heading", { level: 2, name: "title" })).toBeInTheDocument();
    expect(screen.getByText("documentBadge")).toBeInTheDocument();
    expect(screen.queryByText("badge")).not.toBeInTheDocument();
    expect(screen.getByText("classifyTitle")).toBeInTheDocument();
    expect(screen.getByText("structureTitle")).toBeInTheDocument();
    expect(screen.getByText("simplifyTitle")).toBeInTheDocument();
    expect(screen.getAllByText("sourceTitle")).toHaveLength(2);
    expect(screen.getByText("controlTitle")).toBeInTheDocument();
    expect(screen.getByText("accessTitle")).toBeInTheDocument();
  });
});
