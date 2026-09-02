import { render, screen } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { NotionConnectError } from "./notion-connect-error";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

function paramsWith(value: string | null) {
  vi.mocked(useSearchParams).mockReturnValue({
    get: (key: string) => (key === "notion_error" ? value : null),
  } as unknown as ReturnType<typeof useSearchParams>);
}

describe("NotionConnectError", () => {
  it("renders nothing when the URL carries no Notion error", () => {
    paramsWith(null);

    const { container } = render(<NotionConnectError />);

    expect(container).toBeEmptyDOMElement();
  });

  it("names the refusal when the developer cancelled in Notion", () => {
    paramsWith("denied");

    render(<NotionConnectError />);

    expect(screen.getByRole("alert")).toHaveTextContent("denied");
  });

  it("says the connection failed otherwise", () => {
    paramsWith("failed");

    render(<NotionConnectError />);

    expect(screen.getByRole("alert")).toHaveTextContent("failed");
  });

  it("ignores a value it does not know", () => {
    paramsWith("something-else");

    const { container } = render(<NotionConnectError />);

    expect(container).toBeEmptyDOMElement();
  });
});
