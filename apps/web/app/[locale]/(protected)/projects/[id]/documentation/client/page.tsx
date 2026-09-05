"use client";

import { CheckCircle2, Eye, LoaderCircle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { use } from "react";
import { useClientContentPreview } from "@/features/documentation/hooks";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ClientMainTabs } from "../../client-main-tabs";

// Step 4 — the mirror. A step named "ce que lit votre client" shows what he
// reads, not a paragraph about it: the very component his own page renders,
// framed by publication facts. Preview and page were made the same component
// precisely so they cannot drift — this step banks on that a second time.
export default function ClientStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("Projects.Documentation.Mirror");
  const format = useFormatter();
  const preview = useClientContentPreview(id);

  if (preview.isPending) {
    return <Skeleton className="h-48 w-full" />;
  }

  const current = preview.data?.current;
  const pending = preview.data?.pending;
  const published = (current?.sections.length ?? 0) > 0;

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        {/* The frame: since when this is live, and — the atomic publication
            made legible — whether a newer version is ready but not yet shown. */}
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {published ? (
            <>
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              {current?.publishedAt
                ? t("liveSince", {
                    date: format.dateTime(new Date(current.publishedAt), {
                      dateStyle: "long",
                    }),
                  })
                : t("live")}
            </>
          ) : (
            t("nothing")
          )}
        </p>
        {pending && (
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
            {t("pendingNotice", {
              ready: pending.readySectionCount,
              expected: pending.expectedSectionCount,
            })}
          </p>
        )}
      </div>

      {/* The mirror renders in Lait, the client's material: what the
          developer sees here is what the client sees, ground included. */}
      {published ? (
        <div data-theme="lait" className="rounded-lg bg-background p-4 text-foreground sm:p-5">
          <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Eye className="size-3.5 shrink-0" />
            {t("throughTheirEyes")}
          </p>
          {/* The exact surface the client operates, current-task tab included. */}
          <ClientMainTabs projectId={id} />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8">
          <p className="text-sm text-muted-foreground">{t("emptyBody")}</p>
        </div>
      )}
    </main>
  );
}
