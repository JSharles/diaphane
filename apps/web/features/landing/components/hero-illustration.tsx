import Image from "next/image";

// The hero's one light source (DESIGN.md § 5): a static illustration behind
// the title, not a global wash. The wave is drawn in pale lines on a
// transparent ground, so the ink shows through it; it is scaled past the
// viewport on both sides so the lines run off the edges rather than sitting
// in a frame, and masked at the top, bottom and sides so it fades into the
// ground instead of ending. Decorative: aria-hidden, inert, behind the
// content, and gone under reduced motion is not needed since nothing moves.
export function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]"
    >
      {/* The centre is masked out: the wave runs at the edges of the hero and
          leaves the words alone, so nothing is read through a line. */}
      <div className="absolute top-1/2 left-1/2 w-[200%] max-w-none -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(ellipse_46%_54%_at_50%_50%,transparent_35%,black_88%)] sm:w-[165%] lg:w-[140%]">
        <Image
          src="/images/illustration.png"
          alt=""
          width={500}
          height={500}
          priority
          className="h-auto w-full opacity-40"
        />
      </div>
    </div>
  );
}
