"use client";

import { ArrowLeft, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { use, useEffect, type ReactNode } from "react";
import { DocumentationRail } from "@/features/documentation/components/documentation-rail";
import { useProject } from "@/features/projects/hooks";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

// The documentary feature in one place (specs/022): every step renders inside
// this layout, so a step cannot exist without the rail and the four cannot
// drift apart. The contributor gate lives here once instead of in each page —
// the API refuses independently either way.
export default function DocumentationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isPending, isError, refetch } = useProject(id);
  const router = useRouter();
  const t = useTranslations("Projects.Documentation.Hub");

  const isClient = project?.role === "client";

  useEffect(() => {
    if (isClient) router.replace(`/projects/${id}`);
  }, [isClient, id, router]);

  if (isPending || isClient) return <Skeleton className="h-48 w-full" />;

  // A failed refetch keeps the previous data around — isError is checked so a
  // stale project from an earlier session never renders contributor surfaces.
  if (isError || !project) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <TriangleAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="space-y-5">
        <Link
          href={`/projects/${id}`}
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </div>

      {/* At 390px the rail stacks above the panel (FR-011); from md it sits
          beside, fixed width, the panel taking the rest. */}
      <div className="flex flex-col gap-8 md:flex-row md:gap-10">
        <aside className="shrink-0 md:w-60">
          <DocumentationRail projectId={id} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
