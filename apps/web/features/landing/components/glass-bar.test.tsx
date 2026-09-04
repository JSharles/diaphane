import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GlassBar } from "./glass-bar";

vi.mock("@/shared/components/GlassSurface", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="glass-surface">{children}</div>
  ),
}));

describe("GlassBar", () => {
  it("upgrades to the live glass surface after mount, keeping its children", async () => {
    const { getByText, getByTestId } = render(<GlassBar>contenu</GlassBar>);
    await waitFor(() => expect(getByTestId("glass-surface")).toBeInTheDocument());
    expect(getByText("contenu")).toBeInTheDocument();
  });
});
