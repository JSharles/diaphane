import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConnections } from "../api/connections";
import { connectionTone, useConnections } from "./use-connections";

vi.mock("../api/connections", () => ({
  getConnections: vi.fn(),
}));

const mockedGetConnections = vi.mocked(getConnections);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const connections = {
  github: { connected: true, needsReconnect: false },
  notion: { connected: true, needsReconnect: false, workspaceName: "Acme" },
};

describe("useConnections", () => {
  beforeEach(() => {
    mockedGetConnections.mockReset();
  });

  it("returns the developer's connections", async () => {
    mockedGetConnections.mockResolvedValue(connections);

    const { result } = renderHook(() => useConnections(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(connections);
  });

  it("does not fetch while disabled", () => {
    mockedGetConnections.mockResolvedValue(connections);

    const { result } = renderHook(() => useConnections({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetConnections).not.toHaveBeenCalled();
  });

  it("connectionTone reads waiting, live, or unknown off a connection", () => {
    expect(connectionTone(undefined)).toBe("waiting");
    expect(connectionTone({ connected: false, needsReconnect: false })).toBe("waiting");
    expect(connectionTone({ connected: true, needsReconnect: false })).toBe("live");
    expect(connectionTone({ connected: true, needsReconnect: true })).toBe("unknown");
  });
});
