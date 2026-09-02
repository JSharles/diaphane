import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../lib/api-client";
import { getConnections, notionConnectUrl } from "./connections";

vi.mock("../lib/api-client", () => ({
  API_URL: "http://localhost:3001",
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("shared/api/connections", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("getConnections gets /connections", async () => {
    mockedApiFetch.mockResolvedValue({
      github: { connected: true, needsReconnect: false },
      notion: { connected: false, needsReconnect: false, workspaceName: null },
    });

    const result = await getConnections();

    expect(mockedApiFetch).toHaveBeenCalledWith("/connections");
    expect(result.notion.connected).toBe(false);
  });

  it("notionConnectUrl points at the API's Notion entry point with the locale and where to come back", () => {
    expect(notionConnectUrl("fr", "/projects/p-1")).toBe(
      "http://localhost:3001/connections/notion?locale=fr&returnTo=%2Fprojects%2Fp-1",
    );
  });
});
