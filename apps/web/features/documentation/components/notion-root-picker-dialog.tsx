"use client";

import { Check, ExternalLink, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { notionConnectUrl } from "@/shared/api/connections";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { apiErrorMessage } from "@/shared/lib/api-client";
import { useAddNotionRoot, useNotionPages } from "../hooks";

interface NotionRootPickerDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The pages the developer ticked in Notion, each addable as a racine of this
// project. Notion indexes a freshly ticked page a moment after the OAuth
// return, so the list carries its own refresh rather than a hint to reload.
export function NotionRootPickerDialog({
  projectId,
  open,
  onOpenChange,
}: NotionRootPickerDialogProps) {
  const t = useTranslations("Projects.Documentation.NotionRoots");
  const tToasts = useTranslations("Toasts");
  const locale = useLocale();
  const pages = useNotionPages(projectId, { enabled: open });
  const add = useAddNotionRoot(projectId);
  const [addingPageId, setAddingPageId] = useState<string | null>(null);

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) add.reset();
    onOpenChange(nextOpen);
  }

  function addRoot(pageId: string) {
    setAddingPageId(pageId);
    add.mutate(pageId, { onSettled: () => setAddingPageId(null) });
  }

  const items = pages.data?.pages ?? [];

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pickerTitle")}</DialogTitle>
          <DialogDescription>{t("pickerDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="link" size="sm" className="h-auto px-0">
            <a href={notionConnectUrl(locale, `/projects/${projectId}`)}>
              <ExternalLink className="size-3.5" />
              {t("tickMorePages")}
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pages.isFetching}
            onClick={() => void pages.refetch()}
          >
            <RefreshCw className={pages.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
            {t("pickerRefresh")}
          </Button>
        </div>

        {pages.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : pages.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(pages.error, t("pickerLoadError"))}
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("pickerEmpty")}</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {items.map((page) => (
              <li key={page.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm" title={page.title}>
                  {page.title}
                </span>
                {page.rootDocumentId ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="size-3.5" aria-hidden />
                    {t("added")}
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={add.isPending}
                    onClick={() => addRoot(page.id)}
                  >
                    {addingPageId === page.id ? t("adding") : t("add")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {add.isError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(add.error, tToasts("genericError"))}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
