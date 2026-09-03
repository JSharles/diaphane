"use client";

import { CheckCircle2, NotebookText, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { notionConnectUrl } from "@/shared/api/connections";
import { NotionConnectError } from "@/shared/components/notion-connect-error";
import { SetupBlock, type SetupTone } from "@/shared/components/setup-block";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { connectionTone, useConnections } from "@/shared/hooks/use-connections";
import { useDocumentationDocuments, useUpdateNotionRoots } from "../hooks";
import { NotionRootPickerDialog } from "./notion-root-picker-dialog";
import { RemoveDocumentDialog } from "./remove-document-dialog";

// The project's Notion card: the choix, in CONTEXT.md's word — which of the
// pages the developer ticked in Notion are this project's racines. Each
// racine is a document source; taking one out is the ordinary document
// removal. The connection itself belongs to the developer and is cut from
// the profile; here it only offers the button that opens Notion's page
// picker, to connect or to tick more pages.
export function NotionRootsCard({ projectId }: { projectId: string }) {
  const t = useTranslations("Projects.Documentation.NotionRoots");
  const locale = useLocale();
  const { data: connections, isPending } = useConnections();
  const documents = useDocumentationDocuments(projectId);
  const update = useUpdateNotionRoots(projectId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removalDocumentId, setRemovalDocumentId] = useState<string | null>(null);

  // The document list is paged; the racines can sit on any page of it, so the
  // card reads it to the end rather than showing whichever happened to load.
  useEffect(() => {
    if (documents.hasNextPage && !documents.isFetchingNextPage) {
      void documents.fetchNextPage();
    }
  }, [documents.hasNextPage, documents.isFetchingNextPage, documents.fetchNextPage, documents]);

  const notion = connections?.notion;
  const connectHref = notionConnectUrl(locale, `/projects/${projectId}`);
  const roots = (documents.data?.items ?? []).filter(
    (document) => document.kind === "notion" && document.status !== "removed",
  );

  // Live means the project reads something: connected, and at least one
  // racine chosen. A connection with nothing chosen still feeds nothing.
  const tone: SetupTone =
    connectionTone(notion) === "live" && roots.length === 0 ? "waiting" : connectionTone(notion);

  return (
    <>
      <SetupBlock
        title={t("title")}
        feeds={{ label: t("feeds"), state: t(`state_${tone}`), tone }}
        description={
          isPending ? (
            <Skeleton className="h-4 w-32" />
          ) : notion?.needsReconnect ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <TriangleAlert className="size-3.5 shrink-0" />
              {t("needsReconnect")}
            </span>
          ) : notion?.connected ? (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0" />
                {notion.workspaceName
                  ? t("connectedTo", { name: notion.workspaceName })
                  : t("connected")}
              </span>
              {roots.length === 0 ? (
                <span>{t("noRoots")}</span>
              ) : (
                <ul className="flex flex-col gap-1">
                  {roots.map((root) => (
                    <li key={root.id} className="flex items-center gap-2">
                      <NotebookText className="size-3.5 shrink-0" aria-hidden />
                      <Link
                        href={`/projects/${projectId}/documentation/sources/${root.id}`}
                        className="min-w-0 truncate text-foreground hover:underline"
                      >
                        {root.title}
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-muted-foreground hover:text-destructive"
                        aria-label={t("removeRoot", { title: root.title })}
                        onClick={() => setRemovalDocumentId(root.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-1.5">
              <NotebookText className="size-3.5 shrink-0" />
              {t("notConnected")}
            </span>
          )
        }
      >
        {!isPending && notion && (!notion.connected || notion.needsReconnect) && (
          <Button asChild variant="outline" size="sm">
            <a href={connectHref}>{notion.connected ? t("reconnect") : t("connect")}</a>
          </Button>
        )}
        {!isPending && notion?.connected && !notion.needsReconnect && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              {t("chooseRoots")}
            </Button>
            {roots.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={update.isPending}
                onClick={() => update.mutate()}
              >
                <RefreshCw className={update.isPending ? "animate-spin" : undefined} />
                {update.isPending ? t("updating") : t("update")}
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <a href={connectHref}>{t("tickMorePages")}</a>
            </Button>
          </>
        )}
      </SetupBlock>
      <NotionConnectError />

      <NotionRootPickerDialog
        projectId={projectId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
      <RemoveDocumentDialog
        projectId={projectId}
        documentId={removalDocumentId}
        open={Boolean(removalDocumentId)}
        onOpenChange={(open) => {
          if (!open) setRemovalDocumentId(null);
        }}
      />
    </>
  );
}
