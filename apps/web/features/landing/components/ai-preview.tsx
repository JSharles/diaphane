import { useTranslations } from "next-intl";
import { ArrowRight, CircleDot } from "lucide-react";

// One worked example: a board ticket on the left, what the client reads on the
// right. Two panels on the page's own ground, no frame around them: the
// frosted right panel is the product surface, and it is the only glass here.
export function AiPreview() {
  const t = useTranslations("Landing.features.preview");

  return (
    <div className="flex flex-col gap-6">
      <span className="w-fit font-mono text-xs font-semibold tracking-[0.08em] text-primary uppercase">
        {t("badge")}
      </span>

      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-border bg-muted p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("sourceLabel")}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground/70">
              {t("sourceStatus")}
            </span>
          </div>
          <p className="font-mono text-sm leading-relaxed text-foreground">
            {t("sourceTitle")}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {t("sourceDescription")}
          </p>
        </div>

        <ArrowRight className="mx-auto size-6 rotate-90 text-primary lg:rotate-0" />

        <div className="rounded-xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("clientLabel")}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <CircleDot className="size-3.5 text-success" aria-hidden="true" />
              {t("clientStatus")}
            </span>
          </div>
          <h3 className="text-balance text-xl font-bold">{t("clientTitle")}</h3>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            {(["why", "impact", "state"] as const).map((key) => (
              <div key={key} className={key === "state" ? "sm:col-span-2" : undefined}>
                <dt className="text-xs font-semibold tracking-wide text-primary uppercase">
                  {t(`${key}Label`)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(key)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            {t("clientNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
