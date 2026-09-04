import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

const GROUPS = [
  { labelKey: "groupHowItWorks", questionNumbers: [1, 2, 3, 4] },
  { labelKey: "groupTrustPricing", questionNumbers: [5, 6, 7] },
] as const;

export function FaqSection() {
  const t = useTranslations("Landing.faq");

  return (
    <section
      id="faq"
      className="mx-auto flex max-w-3xl scroll-mt-24 flex-col gap-10 px-6 py-20"
    >
      <h2 className="text-balance font-serif text-3xl leading-tight font-normal sm:text-[2.5rem]">
        {t("title")}
      </h2>
      {GROUPS.map((group) => (
        <div key={group.labelKey} className="flex flex-col gap-2">
          <h3 className="text-[0.8125rem] font-medium text-fg-3">
            {t(group.labelKey)}
          </h3>
          <div className="flex flex-col divide-y divide-hairline">
            {group.questionNumbers.map((num) => {
              const questionKey = `q${num}` as "q1";
              const answerKey = `a${num}` as "a1";

              return (
                <details key={questionKey} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-base font-medium marker:content-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    {t(questionKey)}
                    <ChevronDown className="size-5 shrink-0 text-fg-3 transition-transform duration-fast group-open:rotate-180" />
                  </summary>
                  <p className="pt-3 text-[0.9375rem] leading-relaxed text-fg-2">
                    {t(answerKey)}
                  </p>
                </details>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
