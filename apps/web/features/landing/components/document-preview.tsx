import { useTranslations } from "next-intl";
import { ArrowRight, Check, FileText } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";

// The three operations are a pipeline, so their order is the information:
// numbered in the copy, no icon tile per step.
const OPERATIONS = ["classify", "structure", "simplify"] as const;

const CATEGORIES = ["project", "how", "roadmap"] as const;

export function DocumentPreview() {
  const t = useTranslations("Landing.features.documentPreview");

  return (
    <div className="mt-12 flex flex-col gap-6">
      <span className="ui-eyebrow w-fit">
        {t("documentBadge")}
      </span>

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(11rem,0.55fr)_minmax(0,1.2fr)]">
        <div className="rounded-lg border border-hairline bg-surface-1 p-5 sm:p-6">
          <p className="ui-meta text-fg-3">
            {t("sourceLabel")}
          </p>
          <div className="mt-5 flex items-start gap-3">
            <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-semibold">{t("sourceTitle")}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-fg-2">
                {t("sourceExcerpt")}
              </p>
            </div>
          </div>
        </div>

        <ol className="flex flex-col justify-center gap-5 px-2">
          {OPERATIONS.map((key, index) => (
            <li key={key} className="relative">
              <p className="text-[0.9375rem] font-medium">{t(`${key}Title`)}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-fg-3">
                {t(`${key}Description`)}
              </p>
              {index < OPERATIONS.length - 1 && (
                <ArrowRight
                  className="mt-3 size-3 rotate-90 text-fg-3"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>

        <div data-theme="lait" className="rounded-lg bg-background p-5 text-foreground sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="ui-meta text-fg-3">
              {t("clientLabel")}
            </p>
            <Badge tone="warning">{t("reviewStatus")}</Badge>
          </div>
          <p className="ui-meta mt-5 text-fg-3">{t("rubriquesLabel")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((category, index) => (
              <span
                key={category}
                className={
                  index === 0
                    ? "ui-badge rounded-sm bg-action px-2.5 py-1 text-on-action"
                    : "ui-badge rounded-sm bg-surface-2 px-2.5 py-1 text-fg-3"
                }
              >
                {t(`${category}Category`)}
              </span>
            ))}
          </div>
          <h3 className="mt-6 font-serif text-[1.625rem] leading-tight font-normal">{t("sectionTitle")}</h3>
          <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed text-fg-2">
            {t("sectionText")}
          </p>
          <div className="mt-6 flex gap-3 border-t border-hairline pt-4">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-[0.8125rem] leading-relaxed text-fg-3">
              <strong className="text-foreground">{t("controlLabel")}</strong>{" "}
              {t("controlText")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
