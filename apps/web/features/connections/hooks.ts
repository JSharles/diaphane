"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disconnectGithub, getConnections } from "./api";

export const connectionsKey = ["connections"] as const;

export function useConnections() {
  return useQuery({ queryKey: connectionsKey, queryFn: getConnections });
}

// Cutting GitHub also changes what every board card says (the board is
// named but no longer read), so the project queries are invalidated too.
export function useDisconnectGithub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectGithub,
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionsKey });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
