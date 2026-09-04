import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function ClosingBand() {
  const t = useTranslations("Landing.closing");

  // Phosphor: the light band is gone — the page closes by *lighting up*
  // instead of flipping to a bright surface. This headline is the page's
  // one sanctioned glow-strong (DESIGN.md, Rarity Rule); everything around
  // it stays matte, and the top hairline separates it from the FAQ.
  return (
    <section className="border-t px-6 py-20 text-center">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        <h2 className="text-glow-strong text-balance text-3xl leading-tight font-black text-white sm:text-4xl">
          {t("title")}
          <span className="text-optical-light">{t("titleAccent")}</span>
        </h2>
        <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
          {t("subhead")}
        </p>
        <Link
          href="/signup"
          className="glow-subtle hover:glow-medium mt-8 rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
