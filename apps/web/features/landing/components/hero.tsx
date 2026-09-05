import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { HeroIllustration } from "./hero-illustration";

export function Hero() {
  const tHero = useTranslations("Landing.hero");

  // The hero owns the first viewport: its height is the screen minus the
  // floating bar, so the next section's title starts below the fold. On large
  // screens the copy occupies the left side while the illustration enters
  // from the right; smaller screens keep the copy centered and stack the
  // illustration behind the lower part of the scene.
  return (
    <section className="relative isolate flex min-h-[calc(100svh-6.5rem)] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-1000 sm:py-24 lg:items-start lg:px-[5vw] lg:text-left">
      <HeroIllustration />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center lg:max-w-[42vw] lg:items-start">
        <p className="ui-eyebrow mb-6">
          {tHero("eyebrow")}
        </p>
        {/* Sharp letters under the rays: the light of the hero is the scene
            light behind the title, never a glow on the glyphs themselves. */}
        {/* voice-display (DESIGN.md § 4): Spectral 300, the landing only. */}
        <h1 className="max-w-4xl text-balance font-serif text-[clamp(2.4rem,4.5vw,3.625rem)] leading-[1.04] font-light tracking-[-0.01em]">
          {tHero("titleBefore")}
          {/* The signature light as emphasis: Optical Light on the words where
              the sentence turns — the one place the hue is allowed as text. */}
          <span>{tHero("titleHighlight")}</span>
          {tHero("titleAfter")}
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-balance text-fg-2">
          {tHero("subhead")}
        </p>

        <Button
          asChild
          size="lg"
          typography="marketing"
          className="mt-9"
        >
          <Link href="/signup">{tHero("primaryCta")}</Link>
        </Button>

        <ul className="mt-10 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-3 text-[0.9375rem] text-fg-2 lg:justify-start">
          {(["trustSources", "trustReadOnly", "trustPublishing"] as const).map(
            (key) => (
              <li key={key} className="flex items-center gap-2">
                <Check className="size-4 text-fg-3" aria-hidden="true" />
                {tHero(key)}
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
