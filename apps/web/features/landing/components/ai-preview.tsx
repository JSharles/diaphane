import { useTranslations } from "next-intl";
import { ArrowRight, CircleDot } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const LABEL = "font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase";

// One worked example: a board ticket, then what the client reads. Two panels
// on the page's own ground, no frame around them; the frosted right panel is
// the product surface, and it is the only glass here. Stacked in the hero
// (compact), side by side elsewhere.
export function AiPreview({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Landing.features.preview");

  return (
    <div className="flex flex-col gap-4">
      <span className="w-fit font-mono text-xs font-semibold tracking-[0.08em] text-primary uppercase">
        {t("badge")}
      </span>

      <div
        className={cn(
          "grid grid-cols-1 items-center gap-4",
          !compact && "lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.2fr)] lg:gap-6",
        )}
      >
        <div className="rounded-xl border border-border bg-muted p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className={LABEL}>{t("sourceLabel")}</span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground/70">
              {t("sourceStatus")}
            </span>
          </div>
          <p className="font-mono text-sm leading-relaxed text-foreground">{t("sourceTitle")}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("sourceDescription")}
          </p>
        </div>

        <ArrowRight
          className={cn("mx-auto size-5 rotate-90 text-primary", !compact && "lg:rotate-0")}
          aria-hidden="true"
        />

        <div className="rounded-xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className={LABEL}>{t("clientLabel")}</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <CircleDot className="size-3.5 text-success" aria-hidden="true" />
              {t("clientStatus")}
            </span>
          </div>
          <h3 className="text-balance text-xl font-bold">{t("clientTitle")}</h3>
          <dl className={cn("mt-5 grid gap-4", !compact && "sm:grid-cols-2")}>
            {(["why", "impact", "state"] as const).map((key) => (
              <div key={key} className={!compact && key === "state" ? "sm:col-span-2" : undefined}>
                <dt className={cn(LABEL, "text-optical-light")}>{t(`${key}Label`)}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(key)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
