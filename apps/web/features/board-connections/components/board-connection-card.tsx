"use client";

import { ExternalLink, KanbanSquare, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Link } from "@/i18n/navigation";
import { SetupBlock, type SetupTone } from "@/shared/components/setup-block";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ApiError } from "@/shared/lib/api-client";
import { useBoardConnection, useDisconnectBoard, useUpdateBoardConnection } from "../hooks";
import { ConnectBoardDialog } from "./connect-board-dialog";
import { EstimateUnitField, type EstimateUnit } from "./estimate-unit-field";

function errorMessage(error: unknown, generic: string): string {
  return error instanceof ApiError ? error.message : generic;
}

export function BoardConnectionCard({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
  const { data: connection, isPending } = useBoardConnection(projectId);
  const disconnect = useDisconnectBoard(projectId);
  const update = useUpdateBoardConnection(projectId);
  const t = useTranslations("Projects.BoardConnectionCard");
  const tToasts = useTranslations("Toasts");

  function handleConfirmOpenChange(nextOpen: boolean) {
    if (!nextOpen) disconnect.reset();
    setConfirmDisconnectOpen(nextOpen);
  }

  // AlertDialogAction is Radix's DialogPrimitive.Close under the hood, so it
  // dismisses the dialog on click by default regardless of outcome —
  // preventDefault() here keeps it open until the mutation actually
  // settles, closing only on success, so a slow or failed disconnect stays
  // visible instead of silently reading as "done".
  function handleDisconnect(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    disconnect.mutate(undefined, { onSuccess: () => setConfirmDisconnectOpen(false) });
  }

  // The unit is a reading of the connected board, changed here beside it —
  // the board stays chosen. Re-clicking the unit in place sends nothing.
  function handleEstimateUnitChange(unit: EstimateUnit) {
    if (!connection || unit === connection.estimateUnit) return;
    update.mutate({ estimateUnit: unit });
  }

  // The board is the project's other input, and it states what it feeds. A
  // developer whose GitHub connection is cut or revoked leaves the board
  // named but no longer read: unknown, rather than a service that has
  // quietly stopped.
  const feedsTone: SetupTone = connection?.needsReconnect
    ? "unknown"
    : connection
      ? "live"
      : "waiting";

  return (
    <>
      <SetupBlock
        title={t("title")}
        feeds={{ label: t("feeds"), state: t(`state_${feedsTone}`), tone: feedsTone }}
        description={
          isPending ? (
            <Skeleton className="h-4 w-32" />
          ) : connection?.needsReconnect ? (
            // The GitHub connection lives on the developer's account: the
            // fix is in the profile, not on this card.
            <span className="flex items-center gap-1.5 text-destructive">
              <TriangleAlert className="size-3.5 shrink-0" />
              {t("needsReconnect")}
            </span>
          ) : connection ? (
            <div className="flex flex-col gap-3">
              <a
                href={connection.boardUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground hover:underline"
              >
                {t("connectedTo", { title: connection.boardTitle })}
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
              <EstimateUnitField
                value={connection.estimateUnit}
                onChange={handleEstimateUnitChange}
                disabled={update.isPending}
              />
              {update.isError && (
                <p className="text-sm text-destructive">
                  {errorMessage(update.error, tToasts("genericError"))}
                </p>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-1.5">
              <KanbanSquare className="size-3.5 shrink-0" />
              {t("notConnected")}
            </span>
          )
        }
      >
        {connection?.needsReconnect ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">{t("openProfile")}</Link>
          </Button>
        ) : connection ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disconnect.isPending}
            onClick={() => setConfirmDisconnectOpen(true)}
          >
            {disconnect.isPending ? t("disconnecting") : t("disconnect")}
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            {t("connect")}
          </Button>
        )}
      </SetupBlock>

      <ConnectBoardDialog projectId={projectId} open={open} onOpenChange={setOpen} />

      <AlertDialog open={confirmDisconnectOpen} onOpenChange={handleConfirmOpenChange}>
        {/* reset() only clears the mutation's local state — it doesn't cancel
            the in-flight request. Outside-click is already blocked by Radix's
            own AlertDialogContent; Escape and the disabled Cancel button
            below close the remaining two paths, so the dialog is genuinely
            un-dismissable while pending instead of just looking that way. */}
        <AlertDialogContent
          onEscapeKeyDown={(event) => {
            if (disconnect.isPending) event.preventDefault();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("disconnectConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("disconnectConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {disconnect.isError && (
            <p className="text-sm text-destructive">
              {errorMessage(disconnect.error, tToasts("genericError"))}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnect.isPending}>
              {t("disconnectConfirmCancel")}
            </AlertDialogCancel>
            <AlertDialogAction disabled={disconnect.isPending} onClick={handleDisconnect}>
              {disconnect.isPending ? t("disconnecting") : t("disconnectConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
