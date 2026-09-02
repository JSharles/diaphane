import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConnections } from "@/shared/hooks/use-connections";
import { useAddNotionDocument, useUploadDocument } from "../hooks";
import { AddDocumentDialog } from "./add-document-dialog";

vi.mock("../hooks", () => ({
  useUploadDocument: vi.fn(),
  useAddNotionDocument: vi.fn(),
}));

vi.mock("@/shared/hooks/use-connections", () => ({
  useConnections: vi.fn(),
}));

const mockedUpload = vi.mocked(useUploadDocument);
const mockedAddNotion = vi.mocked(useAddNotionDocument);
const mockedConnections = vi.mocked(useConnections);

function notionConnected(connected: boolean, isPending = false) {
  mockedConnections.mockReturnValue({
    data: isPending
      ? undefined
      : {
          github: { connected: true, needsReconnect: false },
          notion: { connected, needsReconnect: false, workspaceName: null },
        },
    isPending,
  } as unknown as ReturnType<typeof useConnections>);
}

function mutation() {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
}

describe("AddDocumentDialog", () => {
  beforeEach(() => {
    mockedUpload.mockReturnValue(mutation() as unknown as ReturnType<typeof useUploadDocument>);
    mockedAddNotion.mockReturnValue(
      mutation() as unknown as ReturnType<typeof useAddNotionDocument>,
    );
    notionConnected(true);
  });

  it("adds an uploaded document to the project source", async () => {
    const upload = mutation();
    mockedUpload.mockReturnValue(upload as unknown as ReturnType<typeof useUploadDocument>);
    const user = userEvent.setup();
    const file = new File(["project brief"], "brief.pdf", { type: "application/pdf" });

    render(
      <AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />,
    );
    await user.upload(screen.getByLabelText("fileLabel"), file);
    await user.click(screen.getByRole("button", { name: "uploadSubmit" }));

    expect(upload.mutate).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("adds an existing Notion page as another contribution to the same source", async () => {
    const addNotion = mutation();
    mockedAddNotion.mockReturnValue(
      addNotion as unknown as ReturnType<typeof useAddNotionDocument>,
    );
    const user = userEvent.setup();

    render(
      <AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />,
    );
    await user.click(screen.getByRole("tab", { name: "notionTab" }));
    await user.type(
      screen.getByLabelText("notionPageUrlLabel"),
      "https://notion.so/project-brief",
    );
    await user.click(screen.getByRole("button", { name: "notionSubmit" }));

    expect(addNotion.mutate).toHaveBeenCalledWith(
      { pageUrl: "https://notion.so/project-brief" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("offers « Connecter Notion », coming back to the sources, when the developer is not connected", async () => {
    notionConnected(false);
    const user = userEvent.setup();

    render(<AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "notionTab" }));

    expect(screen.getByText("notionUnavailable")).toBeInTheDocument();
    expect(screen.queryByLabelText("notionPageUrlLabel")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "connectNotion" })).toHaveAttribute(
      "href",
      "http://localhost:3001/connections/notion?locale=fr&returnTo=%2Fprojects%2Fproject-1%2Fdocumentation%2Fsources",
    );
  });

  it("says it is checking while the connections load", async () => {
    notionConnected(false, true);
    const user = userEvent.setup();

    render(<AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "notionTab" }));

    expect(screen.getByText("notionChecking")).toBeInTheDocument();
  });

  // It announced itself as a tablist while implementing none of the contract:
  // no tabpanel, no aria-controls, no roving tabindex, no arrow keys.
  // Promising tab semantics and not delivering them is worse for a screen
  // reader than plain buttons.
  it("implements the tab contract it announces", () => {
    render(<AddDocumentDialog projectId="project-1" open onOpenChange={vi.fn()} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);

    const panel = screen.getByRole("tabpanel");
    const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    expect(selected).toBeDefined();
    expect(selected).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", selected!.id);
  });
});
