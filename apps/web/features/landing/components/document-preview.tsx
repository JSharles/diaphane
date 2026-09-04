import { useTranslations } from "next-intl";
import { ArrowRight, Check, FileText } from "lucide-react";

// The three operations are a pipeline, so their order is the information:
// numbered in the copy, no icon tile per step.
const OPERATIONS = ["classify", "structure", "simplify"] as const;

const CATEGORIES = ["project", "how", "roadmap"] as const;

export function DocumentPreview() {
  const t = useTranslations("Landing.features.documentPreview");

  return (
    <div className="flex flex-col gap-6">
      <span className="w-fit font-mono text-xs font-semibold tracking-[0.08em] text-primary uppercase">
        {t("documentBadge")}
      </span>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(11rem,0.55fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-border bg-muted p-5 sm:p-6">
          <p className="font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {t("sourceLabel")}
          </p>
          <div className="mt-5 flex items-start gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold">{t("sourceTitle")}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t("sourceExcerpt")}
              </p>
            </div>
          </div>
        </div>

        <ol className="flex flex-col justify-center gap-5 px-2">
          {OPERATIONS.map((key, index) => (
            <li key={key} className="relative">
              <p className="text-sm font-bold">{t(`${key}Title`)}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t(`${key}Description`)}
              </p>
              {index < OPERATIONS.length - 1 && (
                <ArrowRight
                  className="mt-3 size-3 rotate-90 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {t("clientLabel")}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {t("reviewStatus")}
            </span>
          </div>
          <p className="mt-5 font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">{t("rubriquesLabel")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((category, index) => (
              <span
                key={category}
                className={
                  index === 0
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                    : "rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground"
                }
              >
                {t(`${category}Category`)}
              </span>
            ))}
          </div>
          <h3 className="mt-6 text-xl font-bold">{t("sectionTitle")}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("sectionText")}
          </p>
          <div className="mt-6 flex gap-3 border-t border-border pt-4">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">{t("controlLabel")}</strong>{" "}
              {t("controlText")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
