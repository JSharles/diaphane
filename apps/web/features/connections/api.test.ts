import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/shared/lib/api-client";
import { disconnectGithub, disconnectNotion } from "./api";

vi.mock("@/shared/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("features/connections/api", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("disconnectGithub deletes /connections/github", async () => {
    mockedApiFetch.mockResolvedValue(undefined);

    await disconnectGithub();

    expect(mockedApiFetch).toHaveBeenCalledWith("/connections/github", { method: "DELETE" });
  });

  it("disconnectNotion deletes /connections/notion", async () => {
    mockedApiFetch.mockResolvedValue(undefined);

    await disconnectNotion();

    expect(mockedApiFetch).toHaveBeenCalledWith("/connections/notion", { method: "DELETE" });
  });
});
