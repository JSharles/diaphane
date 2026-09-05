import Image from "next/image";

// The hero's one light source (DESIGN.md § 5): a static illustration behind
// the title, not a global wash. Its transparent ground lets the ink show
// through. On large screens it occupies the right side of the hero, with a
// short horizontal fade where it meets the copy; on smaller screens it sits
// below the copy with the same transition turned vertically. The artwork
// itself remains at full opacity. Decorative: aria-hidden and inert.
export function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[42%] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_100%)] lg:inset-y-0 lg:right-0 lg:left-[42%] lg:h-auto lg:[mask-image:linear-gradient(to_right,transparent_0%,black_12%,black_100%)]"
    >
      <div className="absolute bottom-0 left-1/2 w-full -translate-x-1/2 lg:top-1/2 lg:bottom-auto lg:left-0 lg:translate-x-0 lg:-translate-y-1/2">
        <Image
          src="/images/illustration.png"
          alt=""
          width={1366}
          height={768}
          priority
          className="h-auto w-full opacity-100"
        />
      </div>
    </div>
  );
}
