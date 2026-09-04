"use client";

import { TriangleAlert, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { use } from "react";
import { BoardConnectionCard } from "@/features/board-connections/components/board-connection-card";
import { DocumentationSummaryCard } from "@/features/documentation/components/documentation-summary-card";
import { NotionRootsCard } from "@/features/documentation/components/notion-roots-card";
import { MeetingCard } from "@/features/projects/components/meeting-card";
import { MeetingLinkCard } from "@/features/projects/components/meeting-link-card";
import { ProjectPreferences } from "@/features/projects/components/project-preferences";
import { TeamPanel } from "@/features/projects/components/team-panel";
import { TeamSummaryCard } from "@/features/projects/components/team-summary-card";
import { useProject } from "@/features/projects/hooks";
import { SettingsSectionHeading } from "@/shared/components/settings-section-heading";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import { ClientMainTabs } from "./client-main-tabs";
import { ClientReadingHeader } from "./client-reading-header";
import { PageHeader } from "@/shared/components/page-header";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: project, isPending, isError, refetch } = useProject(id);
  const { data: currentUser, isPending: userPending } = useCurrentUser();
  const t = useTranslations("Projects.ProjectPage");

  if (isPending || userPending) {
    return <Skeleton className="h-8 w-64" />;
  }

  // A failed refetch keeps the previous `data` around by default (React
  // Query) — checking isError here (rather than only `!project`) stops a
  // stale project from a prior session in this tab (e.g. after logout/login
  // as someone else) from rendering, including admin-only cartouches, even
  // once the fresh fetch is rejected. An explicit retry beats a silent blank
  // page (critique P2) — this IS the transparency the product sells.
  if (isError || !project) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <TriangleAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("loadErrorTitle")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          {t("loadErrorRetry")}
        </Button>
      </div>
    );
  }

  // What this page shows comes from the account, not the membership: a
  // developer tends the project, a client reads it.
  const isContributor = currentUser?.accountKind === "developer";

  return (
    // Both branches are natural-height now, not forced to fill the
    // viewport — see the client branch's own comment below for why the
    // last remnant of that (ClientMainTabs' lg:h-full) was dropped too.
    //
    // Capped at the same max-w-5xl as the documentation and the setup screen.
    // This page was the only one left uncapped, so on a wide display a card
    // holding two lines of text stretched past 1800px and its own arrow ended
    // up a screen away from its icon — read as an empty shelf rather than as
    // calm. Three screens a developer moves between, one measure, no jump.
    <div className="flex w-full flex-col gap-8">
      {isContributor ? (
        // The workspace header: the way back, the title in the voice, and
        // the meeting shortcut as the page's one action (the client's page
        // has MeetingCard for that).
        <PageHeader
          backHref="/home"
          backLabel={t("backToProjects")}
          title={project.title}
          action={
            project.meetingUrl ? (
              <Button asChild size="sm">
                <a href={project.meetingUrl} target="_blank" rel="noreferrer">
                  <Video className="size-4" />
                  {t("joinMeeting")}
                </a>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ClientReadingHeader project={project} backLabel={t("backToProjects")} />
      )}

      {isContributor ? (
        // The order is the hierarchy (revised 2026-08-29 when
        // the documents left for the documentation's own step and made a
        // separate setup route more address than content): the work first,
        // then access, then the wiring at the foot. The connection blocks say
        // what they feed and whether it is live — that line, not their
        // position, is what keeps them from reading as things to do. No gap-*
        // on the column: each block and row supplies its own vertical rhythm
        // via padding + border-b.
        <div className="flex flex-col">
          <DocumentationSummaryCard projectId={id} />
          <TeamSummaryCard projectId={id} isAdmin={project.isAdmin} />

          <SettingsSectionHeading>{t("connections")}</SettingsSectionHeading>
          <NotionRootsCard projectId={id} />
          <BoardConnectionCard projectId={id} />

          <MeetingLinkCard projectId={id} />

          <SettingsSectionHeading>{t("preferences")}</SettingsSectionHeading>
          <ProjectPreferences projectId={id} />
        </div>
      ) : (
        // Redesigned 2026-08-09, third pass (previous version reported:
        // Resources buried in a nested 1fr sub-cell, squeezed illegible on
        // a shorter viewport, and outranked in visual weight by two
        // "coming soon" placeholders with zero real content). A second pass
        // fixed the squeeze but still framed Resources as a secondary card
        // next to Current Task's hero — Current Task and the AI-detected
        // document categories (Roadmap resurfaces here too, once a
        // developer writes/uploads one — it isn't a separate feature
        // anymore) now live together as tabs in one containerless surface,
        // Current Task first and open by default. That second pass also
        // forced the tabs area to fill the full remaining viewport height
        // (lg:h-full) regardless of content — fine for a tab with many
        // resources, but with a real (short) vulgarized task write-up this
        // left the Signature Card's glass panel mostly empty, its glow
        // blobs diluted across a huge dead zone below the actual text (seen
        // live once a board was actually connected). Dropped in favor of
        // natural content height, same fix already applied to the
        // contributor branch above for the same reason. Developer + Team +
        // the Meetings placeholder stay in a narrow sidebar (self-start:
        // it must not stretch to match whatever height the tabs column
        // ends up at).
        // The reading shell (DESIGN.md § 8): the summary column on the left,
        // the reading column at 68ch, the page signed at the foot.
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,68ch)] lg:justify-center lg:gap-12">
            <div className="flex flex-col gap-4 lg:self-start">
              <TeamPanel projectId={id} isAdmin={project.isAdmin} />
              <MeetingCard projectId={id} />
            </div>
            <ClientMainTabs projectId={id} />
          </div>
          <p className="border-t border-hairline pt-4 text-xs text-fg-3">{t("publishedWith")}</p>
        </div>
      )}
    </div>
  );
}
