import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function Hero() {
  const tHero = useTranslations("Landing.hero");

  return (
    <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-1000 mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-16 text-center sm:pt-24 sm:pb-24">
      <p className="mb-6 font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {tHero("eyebrow")}
      </p>
      {/* The AAFAA halo: an intense, tight text-shadow stack that hugs each
          glyph — bright core bleed, fast falloff (text-halo-title). The
          light lives ON the letters, film-credit style. */}
      <h1 className="text-halo-title max-w-4xl text-balance text-4xl leading-[1.02] font-black tracking-[-0.035em] sm:text-6xl lg:text-7xl">
        {tHero("titleBefore")}
        {/* The signature light as emphasis: Optical Light on the words where
            the sentence turns — the one place the hue is allowed as text. */}
        <span className="text-optical-light">{tHero("titleHighlight")}</span>
        {tHero("titleAfter")}
      </h1>
      <p className="mt-7 max-w-2xl text-lg leading-relaxed text-balance text-muted-foreground sm:text-xl">
        {tHero("subhead")}
      </p>

      <Link
        href="/signup"
        className="mt-9 rounded-md bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-white hover:glow-subtle focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {tHero("primaryCta")}
      </Link>

      <ul className="mt-10 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
        {(["trustSources", "trustReadOnly", "trustPublishing"] as const).map(
          (key) => (
            <li key={key} className="flex items-center gap-2">
              <Check className="size-4 text-optical-light" aria-hidden="true" />
              {tHero(key)}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
