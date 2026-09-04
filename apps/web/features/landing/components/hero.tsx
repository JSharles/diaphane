import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AiPreview } from "./ai-preview";

// The proof sits in the first viewport: the promise on the left, the ticket
// before/after on the right, so the visitor sees the product before reading
// about it. Centered while stacked, two columns from lg.
export function Hero() {
  const tHero = useTranslations("Landing.hero");

  return (
    <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-1000 mx-auto grid max-w-6xl gap-12 px-6 pt-16 pb-16 sm:pt-24 sm:pb-24 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <p className="mb-6 font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {tHero("eyebrow")}
        </p>
        {/* Sharp letters under the rays: the light of the hero is the scene
            light behind the title, never a glow on the glyphs themselves. */}
        <h1 className="max-w-4xl text-balance text-4xl leading-[1.02] font-black tracking-[-0.035em] sm:text-6xl">
          {tHero("titleBefore")}
          {/* The signature light as emphasis: Optical Light on the words where
              the sentence turns, the one place the hue is allowed as text. */}
          <span className="text-optical-light">{tHero("titleHighlight")}</span>
          {tHero("titleAfter")}
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-balance text-muted-foreground">
          {tHero("subhead")}
        </p>

        <Link
          href="/signup"
          className="mt-9 rounded-md bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-white hover:glow-subtle focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {tHero("primaryCta")}
        </Link>
        <p className="mt-5 max-w-xl text-sm text-muted-foreground">{tHero("facts")}</p>
      </div>

      <AiPreview compact />
    </section>
  );
}
