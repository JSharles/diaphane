import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-client";
import { useUploadDocument } from "../hooks";
import { AddDocumentDialog } from "./add-document-dialog";

vi.mock("../hooks", () => ({
  useUploadDocument: vi.fn(),
}));

const mockedUpload = vi.mocked(useUploadDocument);

function mutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  };
}

describe("AddDocumentDialog", () => {
  beforeEach(() => {
    mockedUpload.mockReturnValue(mutation() as unknown as ReturnType<typeof useUploadDocument>);
  });

  it("adds an uploaded document to the project source", async () => {
    const upload = mutation();
    mockedUpload.mockReturnValue(upload as unknown as ReturnType<typeof useUploadDocument>);
    const user = userEvent.setup();
    const file = new File(["project brief"], "brief.pdf", { type: "application/pdf" });

    render(<AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />);
    await user.upload(screen.getByLabelText("fileLabel"), file);
    await user.click(screen.getByRole("button", { name: "uploadSubmit" }));

    expect(upload.mutate).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("offers no Notion address to paste: the racines are chosen on the Notion card", () => {
    render(<AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />);

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "uploadSubmit" })).toBeDisabled();
  });

  it("shows the upload error inline", () => {
    mockedUpload.mockReturnValue(
      mutation({ isError: true, error: new ApiError("Too large", 400) }) as unknown as ReturnType<
        typeof useUploadDocument
      >,
    );

    render(<AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Too large");
  });
});
