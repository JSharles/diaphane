"use client";

import { Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Project } from "schemas";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import { CreateProjectDialog } from "./create-project-dialog";
import { useProjects } from "../hooks";

// docs/PRODUCT.md "progress_percentage: entered manually, or computed from
// tasks?" — resolved 2026-08-09: computed, from the board's own Status
// column task counts (apps/api TaskVulgarizationService). The pill's label
// is derived here from that single number rather than stored as its own
// free-text field, so it can never drift out of sync with the bar next to
// it and stays translated for whoever is looking at the card.
function progressStatusKey(percentage: number): "notStarted" | "inProgress" | "complete" {
  if (percentage <= 0) return "notStarted";
  if (percentage >= 100) return "complete";
  return "inProgress";
}

// Statuses are functional, never decorative: only a finished project earns
// the success tone; in progress and not started are both neutral, because
// being under way is not a warning (DESIGN.md § 3 Statuts).
function badgeTone(percentage: number): "success" | "neutral" {
  return percentage >= 100 ? "success" : "neutral";
}

function CreatedAt({ createdAt }: { createdAt: string }) {
  const locale = useLocale();
  const t = useTranslations("Home");
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (
    <p className="text-[0.8125rem] text-fg-3">
      {t("createdAt", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date) })}
    </p>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const t = useTranslations("Home");

  return (
    <Link key={project.id} href={`/projects/${project.id}`}>
      <Card className="h-full gap-4 transition-colors duration-fast hover:border-hairline-strong hover:bg-surface-2">
        {/* No icon square: a project card does not need a folder pictogram
            to say it is a project (DESIGN.md § 6 Carte). */}
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{project.title}</CardTitle>
            {project.progressPercentage != null ? (
              <Badge tone={badgeTone(project.progressPercentage)} className="shrink-0">
                {t(`status.${progressStatusKey(project.progressPercentage)}`)}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {project.meetingUrl ? (
            // Not a nested <a> — the whole card is already a Link, and a
            // real anchor here would be invalid/inaccessible HTML nested
            // inside another. stopPropagation keeps this click from also
            // triggering the card's own navigation to the project page.
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.open(project.meetingUrl ?? "", "_blank", "noopener,noreferrer");
              }}
            >
              <Video className="size-4" />
              {t("joinMeeting")}
            </Button>
          ) : null}
          {project.createdAt ? <CreatedAt createdAt={project.createdAt} /> : null}
          {project.progressPercentage != null ? (
            // The percentage sits on the bar's own line, to the right
            // (DESIGN.md § 6 Barre de progression).
            <div className="flex items-center gap-3">
              <Progress value={project.progressPercentage} className="flex-1" />
              <span className="shrink-0 text-[0.8125rem] text-fg-3">
                {project.progressPercentage}%
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function ProjectList() {
  const { data: projects, isPending } = useProjects();
  const { data: currentUser } = useCurrentUser();
  const [createOpen, setCreateOpen] = useState(false);
  const t = useTranslations("Home");
  const canCreateProject = currentUser?.accountKind === "developer";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {/* h1, not h2 (impeccable polish pass, 2026-08-10): this is the
            page's actual subject — WelcomeCard's greeting above it is
            deliberately not a heading, so there's nothing this needs to
            nest under. */}
        <h1 className="font-serif text-3xl leading-[1.15] font-normal">{t("title")}</h1>
        {canCreateProject ? (
          <Button onClick={() => setCreateOpen(true)}>{t("newProject")}</Button>
        ) : null}
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !projects || projects.length === 0 ? (
        // An empty state is one of the two places a light source is allowed
        // behind (DESIGN.md § 6 État vide): title, sentence, one action.
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-lg border border-hairline py-16 text-center">
          <div className="light-behind pointer-events-none absolute inset-0" aria-hidden="true" />
          <p className="relative text-base font-medium">{t("emptyTitle")}</p>
          <p className="relative max-w-sm text-[0.9375rem] text-fg-2">{t("emptyDescription")}</p>
          {canCreateProject ? (
            <Button className="relative mt-2" onClick={() => setCreateOpen(true)}>
              {t("emptyCta")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {canCreateProject ? (
        <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}
    </div>
  );
}
