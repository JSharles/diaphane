import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/shared/lib/api-client";
import { disconnectGithub, getConnections } from "./api";

vi.mock("@/shared/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("features/connections/api", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("getConnections gets /connections", async () => {
    mockedApiFetch.mockResolvedValue({ github: { connected: true, needsReconnect: false } });

    const result = await getConnections();

    expect(mockedApiFetch).toHaveBeenCalledWith("/connections");
    expect(result.github.connected).toBe(true);
  });

  it("disconnectGithub deletes /connections/github", async () => {
    mockedApiFetch.mockResolvedValue(undefined);

    await disconnectGithub();

    expect(mockedApiFetch).toHaveBeenCalledWith("/connections/github", { method: "DELETE" });
  });
});
