"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { AvailableBoard, EstimateUnit } from "schemas";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiError } from "@/shared/lib/api-client";
import { useAvailableBoards, useConnectBoard } from "../hooks";
import { EstimateUnitField } from "./estimate-unit-field";

interface ConnectBoardDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function errorMessage(error: unknown, generic: string): string {
  return error instanceof ApiError ? error.message : generic;
}

// The picker opens straight on the boards the developer's GitHub connection
// can see: the consent was given at login, there is no GitHub detour here.
// A developer who cut that connection is sent to their profile to redo it.
export function ConnectBoardDialog({ projectId, open, onOpenChange }: ConnectBoardDialogProps) {
  const t = useTranslations("Projects.ConnectBoardDialog");
  const tToasts = useTranslations("Toasts");
  const [selectedBoard, setSelectedBoard] = useState<AvailableBoard | null>(null);
  // Defaults to "days"; changeable later on the card without reconnecting.
  const [estimateUnit, setEstimateUnit] = useState<EstimateUnit>("days");
  const boards = useAvailableBoards(projectId, { enabled: open });
  const connect = useConnectBoard(projectId);

  const githubNotConnected =
    boards.error instanceof ApiError && boards.error.code === "GITHUB_NOT_CONNECTED";

  function reset() {
    setSelectedBoard(null);
    setEstimateUnit("days");
    connect.reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  function handleConnect() {
    if (!selectedBoard) return;
    connect.mutate(
      {
        ownerLogin: selectedBoard.ownerLogin,
        ownerType: selectedBoard.ownerType,
        number: selectedBoard.number,
        estimateUnit,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        {boards.isPending ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : boards.isError ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">
              {githubNotConnected
                ? t("githubNotConnected")
                : errorMessage(boards.error, tToasts("genericError"))}
            </p>
            <Button asChild variant="outline">
              <Link href="/profile">{t("goToProfile")}</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {boards.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noBoards")}</p>
            ) : (
              <ul className="flex flex-col gap-2" role="radiogroup" aria-label={t("title")}>
                {boards.data.map((board) => {
                  const isSelected =
                    selectedBoard?.ownerLogin === board.ownerLogin &&
                    selectedBoard?.number === board.number;

                  return (
                    <li key={`${board.ownerLogin}-${board.number}`}>
                      <Button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-between"
                        onClick={() => setSelectedBoard(board)}
                      >
                        <span>
                          {board.ownerLogin} / {board.title}
                        </span>
                        {isSelected && <CheckCircle2 className="size-4" />}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <EstimateUnitField value={estimateUnit} onChange={setEstimateUnit} />
            <Button
              type="button"
              disabled={!selectedBoard || connect.isPending}
              onClick={handleConnect}
            >
              {connect.isPending ? t("connectPending") : t("connectSubmit")}
            </Button>
            {connect.isError && (
              <p className="text-sm text-destructive">
                {errorMessage(connect.error, tToasts("genericError"))}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
