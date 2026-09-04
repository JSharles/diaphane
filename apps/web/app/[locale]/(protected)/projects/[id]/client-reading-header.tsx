"use client";

import { ArrowLeft } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { Project } from "schemas";
import { useProjectMembers } from "@/features/projects/hooks";
import { Link } from "@/i18n/navigation";

// The reading header (DESIGN.md § 8 Lecture client): the project's name in
// ui-title, who publishes these documents in ui-meta, and when the project
// last moved on the right. No action here; the client reads.
export function ClientReadingHeader({
  project,
  backLabel,
}: {
  project: Project;
  backLabel: string;
}) {
  const t = useTranslations("Projects.ProjectPage");
  const format = useFormatter();
  const { data: members } = useProjectMembers(project.id);
  const developer = members?.find((member) => member.accountKind === "developer");

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/home"
        className="inline-flex w-fit items-center gap-1.5 ui-meta text-fg-3 transition-colors duration-fast hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {backLabel}
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h1 className="truncate text-base font-medium">{project.title}</h1>
          {developer && (
            <p className="ui-meta text-fg-3">
              {t("publishedBy", { name: developer.firstName })}
            </p>
          )}
        </div>
        <p className="ui-meta text-fg-3">
          {t("updatedOn", {
            date: format.dateTime(new Date(project.updatedAt), { dateStyle: "long" }),
          })}
        </p>
      </div>
    </div>
  );
}
