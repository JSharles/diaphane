import { useTranslations } from "next-intl";

// The sequence is the information, so each step carries its number and
// nothing else in front of it.
const STEPS = ["connect", "context", "invite"] as const;

export function HowItWorksSection() {
  const t = useTranslations("Landing.howItWorks");

  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-5xl scroll-mt-24 px-6 py-16 sm:py-24"
    >
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <h2 className="text-balance font-serif text-3xl leading-tight font-normal sm:text-[2.5rem]">
            {t("title")}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-fg-2">
            {t("subhead")}
          </p>
        </div>

        <ol className="border-y border-hairline">
          {STEPS.map((key, index) => (
            <li
              key={key}
              className="grid gap-2 border-b border-hairline py-7 last:border-b-0 sm:grid-cols-[6rem_1fr] sm:gap-6"
            >
              <p className="text-[0.8125rem] font-medium text-fg-3">
                {t("stepLabel", { number: index + 1 })}
              </p>
              <div>
                <h3 className="text-base font-medium">{t(`${key}Title`)}</h3>
                <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-fg-2">
                  {t(`${key}Description`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
