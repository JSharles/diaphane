import { useTranslations } from "next-intl";
import { AiPreview } from "./ai-preview";
import { DocumentPreview } from "./document-preview";

const PRINCIPLES = ["source", "control", "access"] as const;

export function FeaturesSection() {
  const t = useTranslations("Landing.features");

  return (
    <section
      id="product"
      className="mx-auto flex max-w-5xl scroll-mt-24 flex-col px-6 py-16 sm:py-24"
    >
      <div className="mb-10 max-w-2xl">
        <h2 className="text-balance font-serif text-3xl leading-tight font-normal sm:text-[2.5rem]">
          {t("title")}
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-fg-2">
          {t("subhead")}
        </p>
      </div>
      <AiPreview />
      <DocumentPreview />
      <dl className="mt-12 grid divide-y divide-hairline border-y border-hairline lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {PRINCIPLES.map((key) => (
          <div key={key} className="py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0">
            <dt className="text-base font-medium">{t(`${key}Title`)}</dt>
            <dd className="mt-2 text-[0.9375rem] leading-relaxed text-fg-2">
              {t(`${key}Description`)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
