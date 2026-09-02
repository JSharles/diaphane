"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { apiErrorMessage } from "@/shared/lib/api-client";
import { useUploadDocument } from "../hooks";

interface AddDocumentDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// One way in: a file. The racines Notion are chosen on the project's Notion
// card, among the pages the developer ticked in Notion — no address to paste.
export function AddDocumentDialog({
  projectId,
  open,
  onOpenChange,
}: AddDocumentDialogProps) {
  const t = useTranslations("Projects.Documentation.AddDocument");
  const tToasts = useTranslations("Toasts");
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadDocument(projectId);

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setFile(null);
      upload.reset();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!file) return;
            upload.mutate(file, { onSuccess: () => changeOpen(false) });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-document-file">{t("fileLabel")}</Label>
            <Input
              id="source-document-file"
              type="file"
              accept=".pdf,.docx,image/png,image/jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs leading-relaxed text-muted-foreground">{t("fileHint")}</p>
          </div>
          {upload.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(upload.error, tToasts("genericError"))}
            </p>
          )}
          <Button type="submit" disabled={!file || upload.isPending}>
            {upload.isPending ? t("uploadPending") : t("uploadSubmit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
