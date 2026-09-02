"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectionsKey } from "@/shared/hooks/use-connections";
import { disconnectGithub, disconnectNotion } from "./api";

// Cutting a connection also changes what every project card says (the board
// is named but no longer read, the Notion roots are no longer readable), so
// the project queries are invalidated too.
function useDisconnect(mutationFn: () => Promise<void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionsKey });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export type DisconnectMutation = ReturnType<typeof useDisconnect>;

export function useDisconnectGithub() {
  return useDisconnect(disconnectGithub);
}

export function useDisconnectNotion() {
  return useDisconnect(disconnectNotion);
}
