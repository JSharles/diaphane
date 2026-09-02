import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { disconnectGithub, getConnections } from "./api";
import { connectionsKey, useConnections, useDisconnectGithub } from "./hooks";

vi.mock("./api", () => ({
  getConnections: vi.fn(),
  disconnectGithub: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe("connections hooks", () => {
  it("useConnections returns the developer's connections", async () => {
    vi.mocked(getConnections).mockResolvedValue({
      github: { connected: true, needsReconnect: false },
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useConnections(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.github.connected).toBe(true);
  });

  it("useDisconnectGithub refreshes the connections and every project query on success", async () => {
    vi.mocked(disconnectGithub).mockResolvedValue(undefined);
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDisconnectGithub(), { wrapper: Wrapper });
    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: connectionsKey });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] });
  });
});
