"use client";

import { useQuery } from "@tanstack/react-query";
import { getConnections } from "../api/connections";
import type { SetupTone } from "../components/setup-block";

export const connectionsKey = ["connections"] as const;

export function useConnections(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: connectionsKey,
    queryFn: getConnections,
    enabled: options?.enabled ?? true,
  });
}

// How a connection reads on a card: waiting until connected, live once it
// is, and unknown when the tool stopped accepting it and the developer has
// to connect again.
export function connectionTone(
  state: { connected: boolean; needsReconnect: boolean } | undefined,
): SetupTone {
  if (!state || !state.connected) return "waiting";
  return state.needsReconnect ? "unknown" : "live";
}
