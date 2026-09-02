import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { connectionsKey } from "@/shared/hooks/use-connections";
import { disconnectGithub, disconnectNotion } from "./api";
import { useDisconnectGithub, useDisconnectNotion } from "./hooks";

vi.mock("./api", () => ({
  disconnectGithub: vi.fn(),
  disconnectNotion: vi.fn(),
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
  it("useDisconnectGithub refreshes the connections and every project query on success", async () => {
    vi.mocked(disconnectGithub).mockResolvedValue(undefined);
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDisconnectGithub(), { wrapper: Wrapper });
    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(disconnectGithub).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: connectionsKey });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] });
  });

  it("useDisconnectNotion does the same for Notion", async () => {
    vi.mocked(disconnectNotion).mockResolvedValue(undefined);
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDisconnectNotion(), { wrapper: Wrapper });
    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(disconnectNotion).toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: connectionsKey });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["projects"] });
  });
});
