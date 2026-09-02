"use client";

import { Link2, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { notionConnectUrl } from "@/shared/api/connections";
import { NotionConnectError } from "@/shared/components/notion-connect-error";
import { SetupBlock } from "@/shared/components/setup-block";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { connectionTone, useConnections } from "@/shared/hooks/use-connections";
import { API_URL, ApiError } from "@/shared/lib/api-client";
import { type DisconnectMutation, useDisconnectGithub, useDisconnectNotion } from "../hooks";

function errorMessage(error: unknown, generic: string): string {
  return error instanceof ApiError ? error.message : generic;
}

interface ConnectionState {
  connected: boolean;
  needsReconnect: boolean;
}

// One row per tool: what it feeds, whether it is live, the way to connect
// it again and the button to cut it. Connecting GitHub again is the login
// link itself; connecting Notion is a link to the API, which opens Notion's
// page picker and comes back here.
function ConnectionRow({
  title,
  feeds,
  state,
  isPending,
  description,
  connectHref,
  connectLabel,
  disconnect,
  children,
}: {
  title: string;
  feeds: string;
  state: ConnectionState | undefined;
  isPending: boolean;
  description: ReactNode;
  connectHref: string;
  connectLabel: string;
  disconnect: DisconnectMutation;
  children?: ReactNode;
}) {
  const t = useTranslations("Profile.Connections");
  const tToasts = useTranslations("Toasts");
  const tone = connectionTone(state);

  return (
    <>
      <SetupBlock
        title={title}
        feeds={{ label: feeds, state: t(`state_${tone}`), tone }}
        description={isPending ? <Skeleton className="h-4 w-40" /> : description}
      >
        {!isPending && state && (!state.connected || state.needsReconnect) && (
          <Button asChild variant="outline" size="sm">
            <a href={connectHref}>{state.connected ? t("reconnect") : connectLabel}</a>
          </Button>
        )}
        {!isPending && state?.connected && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate()}
          >
            {disconnect.isPending ? t("disconnecting") : t("disconnect")}
          </Button>
        )}
      </SetupBlock>
      {disconnect.isError && (
        <p className="text-sm text-destructive">
          {errorMessage(disconnect.error, tToasts("genericError"))}
        </p>
      )}
      {children}
    </>
  );
}

export function ConnectionsCard() {
  const t = useTranslations("Profile.Connections");
  const locale = useLocale();
  const { data: connections, isPending } = useConnections();
  const disconnectGithub = useDisconnectGithub();
  const disconnectNotion = useDisconnectNotion();

  const github = connections?.github;
  const notion = connections?.notion;

  return (
    <section className="flex flex-col">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("title")}
      </h2>
      <ConnectionRow
        title={t("github")}
        feeds={t("githubFeeds")}
        state={github}
        isPending={isPending}
        connectHref={`${API_URL}/auth/github?locale=${locale}`}
        connectLabel={t("connect")}
        disconnect={disconnectGithub}
        description={
          github?.needsReconnect ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <TriangleAlert className="size-3.5 shrink-0" />
              {t("githubNeedsReconnect")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Link2 className="size-3.5 shrink-0" />
              {github?.connected ? t("githubConnected") : t("githubNotConnected")}
            </span>
          )
        }
      />
      <ConnectionRow
        title={t("notion")}
        feeds={t("notionFeeds")}
        state={notion}
        isPending={isPending}
        connectHref={notionConnectUrl(locale, "/profile")}
        connectLabel={t("connectNotion")}
        disconnect={disconnectNotion}
        description={
          notion?.needsReconnect ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <TriangleAlert className="size-3.5 shrink-0" />
              {t("notionNeedsReconnect")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Link2 className="size-3.5 shrink-0" />
              {!notion?.connected
                ? t("notionNotConnected")
                : notion.workspaceName
                  ? t("notionConnectedTo", { name: notion.workspaceName })
                  : t("notionConnected")}
            </span>
          )
        }
      >
        <NotionConnectError />
      </ConnectionRow>
    </section>
  );
}
