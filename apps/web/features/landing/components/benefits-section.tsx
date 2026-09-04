import { useTranslations } from "next-intl";
import { ClientViewPreview } from "./client-view-preview";

// Two audiences, two forms. The developer reads a list of what changes for
// them; the client's track shows the thing itself, the roadmap their client
// reads, with the three benefits as captions under it.
function TrackHeading({ namespace }: { namespace: "clients" | "developers" }) {
  const t = useTranslations(`Landing.${namespace}`);
  return (
    <div>
      <p className="font-mono text-xs font-semibold tracking-[0.08em] text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h2 className="mt-4 max-w-md text-balance text-3xl font-black tracking-[-0.025em] sm:text-4xl">
        {t("title")}
      </h2>
      <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
        {t("subhead")}
      </p>
    </div>
  );
}

function BenefitList({
  namespace,
  compact,
}: {
  namespace: "clients" | "developers";
  compact?: boolean;
}) {
  const t = useTranslations(`Landing.${namespace}`);
  return (
    <div className={compact ? "grid gap-6 sm:grid-cols-3" : "divide-y divide-border"}>
      {([1, 2, 3] as const).map((n) => (
        <div key={n} className={compact ? undefined : "py-6 first:pt-0 last:pb-0"}>
          <h3 className={compact ? "font-bold" : "text-lg font-bold"}>
            {t(`card${n}Title`)}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t(`card${n}Description`)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BenefitsSection() {
  return (
    <section
      id="benefits"
      className="mx-auto flex max-w-5xl scroll-mt-24 flex-col px-6 py-8 sm:py-12"
    >
      <div
        id="developers"
        className="grid scroll-mt-24 gap-10 border-t border-border py-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-20"
      >
        <TrackHeading namespace="developers" />
        <BenefitList namespace="developers" />
      </div>

      <div
        id="clients"
        className="flex scroll-mt-24 flex-col gap-10 border-t border-border py-14 lg:py-20"
      >
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <TrackHeading namespace="clients" />
          <ClientViewPreview />
        </div>
        <BenefitList namespace="clients" compact />
      </div>
    </section>
  );
}
