import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/shared/lib/api-client";
import {
  connectBoard,
  disconnectBoard,
  getBoardConnection,
  listAvailableBoards,
  updateBoardConnection,
} from "./api";

vi.mock("@/shared/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe("features/board-connections/api", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("getBoardConnection gets /projects/:id/board-connection", async () => {
    mockedApiFetch.mockResolvedValue({ provider: "github" });

    const result = await getBoardConnection("project-1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/projects/project-1/board-connection");
    expect(result).toEqual({ provider: "github" });
  });

  it("getBoardConnection normalizes an undefined (empty-body) response to null", async () => {
    mockedApiFetch.mockResolvedValue(undefined);

    const result = await getBoardConnection("project-1");

    expect(result).toBeNull();
  });

  it("listAvailableBoards gets /projects/:id/board-connection/boards, with no token", async () => {
    mockedApiFetch.mockResolvedValue([]);

    await listAvailableBoards("project-1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/projects/project-1/board-connection/boards");
  });

  it("connectBoard posts the board selection to /projects/:id/board-connection", async () => {
    mockedApiFetch.mockResolvedValue({ provider: "github" });
    const data = { ownerLogin: "acme", ownerType: "Organization" as const, number: 3 };

    await connectBoard("project-1", data);

    expect(mockedApiFetch).toHaveBeenCalledWith("/projects/project-1/board-connection", {
      method: "POST",
      body: data,
    });
  });

  it("updateBoardConnection patches the estimate unit to /projects/:id/board-connection", async () => {
    mockedApiFetch.mockResolvedValue({ provider: "github", estimateUnit: "hours" });

    await updateBoardConnection("project-1", { estimateUnit: "hours" });

    expect(mockedApiFetch).toHaveBeenCalledWith("/projects/project-1/board-connection", {
      method: "PATCH",
      body: { estimateUnit: "hours" },
    });
  });

  it("disconnectBoard deletes /projects/:id/board-connection", async () => {
    mockedApiFetch.mockResolvedValue(undefined);

    await disconnectBoard("project-1");

    expect(mockedApiFetch).toHaveBeenCalledWith("/projects/project-1/board-connection", {
      method: "DELETE",
    });
  });
});
