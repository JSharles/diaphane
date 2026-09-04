import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientViewPreview } from "./client-view-preview";

describe("ClientViewPreview", () => {
  it("renders the example roadmap with the client's own timeline and the roadmap tab selected", () => {
    render(<ClientViewPreview />);

    expect(screen.getByText("projectTitle")).toBeInTheDocument();
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("tabRoadmap");
    for (const key of ["m1Title", "m2Title", "m3Title", "m2S2"]) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
    // The client's markers are not buttons: nothing here moves the position.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("note")).toBeInTheDocument();
  });
});
