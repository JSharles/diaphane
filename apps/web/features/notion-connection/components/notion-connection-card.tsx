"use client";

import { CheckCircle2, NotebookText, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { notionConnectUrl } from "@/shared/api/connections";
import { NotionConnectError } from "@/shared/components/notion-connect-error";
import { SetupBlock } from "@/shared/components/setup-block";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { connectionTone, useConnections } from "@/shared/hooks/use-connections";

// The project's Notion card. The connection belongs to the developer, so
// this card only says whether it is there and offers the one button that
// opens Notion's page picker — to connect, or to tick more pages. The roots
// the project picks among those pages come next (GitHub issue #60). Cutting
// the connection lives on the profile, beside GitHub.
export function NotionConnectionCard({ projectId }: { projectId: string }) {
  const t = useTranslations("Projects.NotionConnectionCard");
  const locale = useLocale();
  const { data: connections, isPending } = useConnections();
  const notion = connections?.notion;

  const connectHref = notionConnectUrl(locale, `/projects/${projectId}`);
  const tone = connectionTone(notion);

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
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 shrink-0" />
              {notion.workspaceName
                ? t("connectedTo", { name: notion.workspaceName })
                : t("connected")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <NotebookText className="size-3.5 shrink-0" />
              {t("notConnected")}
            </span>
          )
        }
      >
        {!isPending && notion && (
          <Button asChild variant="outline" size="sm">
            <a href={connectHref}>
              {!notion.connected
                ? t("connect")
                : notion.needsReconnect
                  ? t("reconnect")
                  : t("choosePages")}
            </a>
          </Button>
        )}
      </SetupBlock>
      <NotionConnectError />
    </>
  );
}
