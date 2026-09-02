"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateBoardConnectionRequest } from "schemas";
import { connectBoard, disconnectBoard, getBoardConnection, listAvailableBoards } from "./api";

export const boardConnectionKey = (projectId: string) =>
  ["projects", projectId, "board-connection"] as const;

export const availableBoardsKey = (projectId: string) =>
  ["projects", projectId, "board-connection", "boards"] as const;

export function useBoardConnection(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: boardConnectionKey(projectId),
    queryFn: () => getBoardConnection(projectId),
    enabled: options?.enabled ?? true,
  });
}

// Fetched only while the picker is open. Errors (GitHub not connected, GitHub
// unreachable) are shown inline in the dialog, not as a generic toast.
export function useAvailableBoards(projectId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: availableBoardsKey(projectId),
    queryFn: () => listAvailableBoards(projectId),
    enabled: options?.enabled ?? true,
    retry: false,
    meta: { skipGlobalErrorToast: true },
  });
}

// Error is surfaced inline in the dialog (see ConnectBoardDialog), not as a
// generic toast — skipGlobalErrorToast opts this out of that default.
export function useConnectBoard(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBoardConnectionRequest) => connectBoard(projectId, data),
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardConnectionKey(projectId) });
    },
  });
}

// Error is surfaced inline in the disconnect confirmation dialog (see
// BoardConnectionCard), not as a generic toast — skipGlobalErrorToast opts
// this out of that default.
export function useDisconnectBoard(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => disconnectBoard(projectId),
    meta: { skipGlobalErrorToast: true },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardConnectionKey(projectId) });
    },
  });
}
