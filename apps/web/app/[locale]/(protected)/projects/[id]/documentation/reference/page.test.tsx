import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReferenceStepPage from "./page";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, use: (value: unknown) => value };
});

vi.mock("@/features/documentation/components/reference-document-view", () => ({
  ReferenceDocumentView: ({ projectId }: { projectId: string }) => (
    <div>reference-document:{projectId}</div>
  ),
}));

describe("ReferenceStepPage", () => {
  // Step 2 exists so the reference document stops being a section at the foot
  // of the documents page (specs/022) — the view is moved, not rebuilt.
  it("makes the reference document the subject of its own screen", () => {
    render(
      <ReferenceStepPage
        params={{ id: "project-1" } as unknown as Promise<{ id: string }>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "name_reference" }),
    ).toBeInTheDocument();
    expect(screen.getByText("reference-document:project-1")).toBeInTheDocument();
  });
});
