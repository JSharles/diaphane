"use client";

import { Link2, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SetupBlock, type SetupTone } from "@/shared/components/setup-block";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ApiError } from "@/shared/lib/api-client";
import { useConnections, useDisconnectGithub } from "../hooks";

function errorMessage(error: unknown, generic: string): string {
  return error instanceof ApiError ? error.message : generic;
}

// The developer's connections, one row per tool. Connecting GitHub again is
// the login link itself: the same consent identifies the developer and
// reads their boards, so a revoked token is healed by logging in once more.
export function ConnectionsCard() {
  const t = useTranslations("Profile.Connections");
  const tToasts = useTranslations("Toasts");
  const locale = useLocale();
  const { data: connections, isPending } = useConnections();
  const disconnect = useDisconnectGithub();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const githubHref = `${apiUrl}/auth/github?locale=${locale}`;

  const github = connections?.github;
  const tone: SetupTone = !github || !github.connected ? "waiting" : github.needsReconnect ? "unknown" : "live";

  return (
    <section className="flex flex-col">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("title")}
      </h2>
      <SetupBlock
        title={t("github")}
        feeds={{ label: t("githubFeeds"), state: t(`state_${tone}`), tone }}
        description={
          isPending ? (
            <Skeleton className="h-4 w-40" />
          ) : github?.needsReconnect ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <TriangleAlert className="size-3.5 shrink-0" />
              {t("githubNeedsReconnect")}
            </span>
          ) : github?.connected ? (
            <span className="flex items-center gap-1.5">
              <Link2 className="size-3.5 shrink-0" />
              {t("githubConnected")}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Link2 className="size-3.5 shrink-0" />
              {t("githubNotConnected")}
            </span>
          )
        }
      >
        {!isPending && github && (!github.connected || github.needsReconnect) && (
          <Button asChild variant="outline" size="sm">
            <a href={githubHref}>{github.connected ? t("reconnect") : t("connect")}</a>
          </Button>
        )}
        {!isPending && github?.connected && (
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
    </section>
  );
}
