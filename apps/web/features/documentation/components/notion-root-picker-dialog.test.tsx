import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-client";
import { useAddNotionRoot, useNotionPages } from "../hooks";
import { NotionRootPickerDialog } from "./notion-root-picker-dialog";

vi.mock("../hooks", () => ({
  useNotionPages: vi.fn(),
  useAddNotionRoot: vi.fn(),
}));

const mockedPages = vi.mocked(useNotionPages);
const mockedAdd = vi.mocked(useAddNotionRoot);

function pages(overrides: Record<string, unknown>) {
  const refetch = vi.fn();
  mockedPages.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch,
    ...overrides,
  } as unknown as ReturnType<typeof useNotionPages>);
  return refetch;
}

function add(overrides: Record<string, unknown> = {}) {
  const mutate = vi.fn();
  mockedAdd.mockReturnValue({
    mutate,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useAddNotionRoot>);
  return mutate;
}

const CANDIDATES = {
  pages: [
    { id: "page-1", title: "Cadrage", url: "https://notion.so/p1", rootDocumentId: "doc-1" },
    { id: "page-2", title: "Roadmap", url: "https://notion.so/p2", rootDocumentId: null },
  ],
};

describe("NotionRootPickerDialog", () => {
  beforeEach(() => {
    add();
  });

  it("reads the pages only while open", () => {
    pages({ data: CANDIDATES });

    render(<NotionRootPickerDialog projectId="project-1" open={false} onOpenChange={vi.fn()} />);

    expect(mockedPages).toHaveBeenCalledWith("project-1", { enabled: false });
  });

  it("lists the pages ticked in Notion, marking those already racines, and adds another", async () => {
    pages({ data: CANDIDATES });
    const mutate = add();
    const user = userEvent.setup();

    render(<NotionRootPickerDialog projectId="project-1" open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Cadrage")).toBeInTheDocument();
    expect(screen.getByText("added")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "add" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "add" }));
    expect(mutate).toHaveBeenCalledWith("page-2", expect.objectContaining({ onSettled: expect.any(Function) }));
  });

  it("says when nothing is ticked yet and offers to tick pages in Notion, with a refresh", async () => {
    const refetch = pages({ data: { pages: [] } });
    const user = userEvent.setup();

    render(<NotionRootPickerDialog projectId="project-1" open onOpenChange={vi.fn()} />);

    expect(screen.getByText("pickerEmpty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "tickMorePages" })).toHaveAttribute(
      "href",
      "http://localhost:3001/connections/notion?locale=fr&returnTo=%2Fprojects%2Fproject-1",
    );
    await user.click(screen.getByRole("button", { name: "pickerRefresh" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows the list error and the add error inline", () => {
    pages({ isError: true, error: new ApiError("Notion refused", 400) });
    add({ isError: true, error: new ApiError("Already a root", 409) });

    render(<NotionRootPickerDialog projectId="project-1" open onOpenChange={vi.fn()} />);

    expect(screen.getByText("Notion refused")).toBeInTheDocument();
    expect(screen.getByText("Already a root")).toBeInTheDocument();
  });

  it("shows a skeleton while the pages load", () => {
    pages({ isPending: true });

    render(<NotionRootPickerDialog projectId="project-1" open onOpenChange={vi.fn()} />);

    // The dialog renders through a portal, so the skeleton is looked up on the document.
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });
});
