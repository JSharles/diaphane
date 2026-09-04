import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";

const LABEL = "ui-meta text-fg-3";

// One worked example: a board ticket, then what the client reads. Two panels
// on the page's own ground, no frame around them; the frosted right panel is
// the product surface, and it is the only glass here.
export function AiPreview() {
  const t = useTranslations("Landing.features.preview");

  return (
    <div className="flex flex-col gap-4">
      <span className="ui-eyebrow w-fit">
        {t("badge")}
      </span>

      <div
        className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1.2fr)] lg:gap-6"
      >
        <div className="rounded-lg border border-hairline bg-surface-1 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className={LABEL}>{t("sourceLabel")}</span>
            <Badge>{t("sourceStatus")}</Badge>
          </div>
          <p className="font-mono text-[0.8125rem] leading-relaxed text-machine">{t("sourceTitle")}</p>
          <p className="mt-3 font-mono text-[0.8125rem] leading-relaxed text-machine">
            {t("sourceDescription")}
          </p>
        </div>

        <ArrowRight
          className="mx-auto size-5 rotate-90 text-primary lg:rotate-0"
          aria-hidden="true"
        />

        <div data-theme="lait" className="rounded-lg bg-background p-5 text-foreground">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className={LABEL}>{t("clientLabel")}</span>
            <Badge tone="success">{t("clientStatus")}</Badge>
          </div>
          <h3 className="text-balance font-serif text-[1.625rem] leading-tight font-normal">
            {t("clientTitle")}
          </h3>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {(["why", "impact", "state"] as const).map((key) => (
              <div key={key} className={key === "state" ? "sm:col-span-2" : undefined}>
                <dt className={LABEL}>{t(`${key}Label`)}</dt>
                <dd className="mt-1 font-serif text-[1.0625rem] leading-relaxed text-fg-2">{t(key)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
