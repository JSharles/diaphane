import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";

export function ClosingBand() {
  const t = useTranslations("Landing.closing");

  // The page closes on the same ground it opened on: no bright band, no
  // glow on the headline. A hairline separates it from the FAQ.
  return (
    <section className="border-t px-6 py-20 text-center">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <p className="ui-eyebrow mb-4">
          {t("eyebrow")}
        </p>
        <h2 className="text-balance font-serif text-3xl leading-tight font-normal sm:text-[2.5rem]">
          {t("title")}
          <span>{t("titleAccent")}</span>
        </h2>
        <p className="mt-5 max-w-xl leading-relaxed text-fg-2">
          {t("subhead")}
        </p>
        <Button
          asChild
          size="lg"
          typography="marketing"
          className="mt-8"
        >
          <Link href="/signup">{t("cta")}</Link>
        </Button>
      </div>
    </section>
  );
}
