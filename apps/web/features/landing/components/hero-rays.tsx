"use client";

import SideRays from "@/shared/components/SideRays";

// The diffuse light behind the hero (React Bits SideRays, vendored) — the
// landing's one scene light. Discipline (DESIGN.md "Hero Rays"):
// - cold-white tones only, slow, masked out by mid-page;
// - its analog grain lives INSIDE the light: a turbulence layer blended in
//   overlay over the rays canvas, so the texture appears where the halo
//   is and stays invisible in the matte black around it (Localized-Light
//   Rule — the global page grain stays at ~1.5%);
// - decorative: aria-hidden, pointer-events-none, behind the content
//   (the parent <main> is `isolate`);
// - gone under prefers-reduced-motion and below `sm`, where the static
//   wash in body::before stands in.
// 320px tile, not 180: `stitchTiles` joins the noise inside one filter region,
// it does nothing across CSS background-repeat. A small tile therefore repeats
// identically across the viewport and the eye reads the grid as banding. A
// larger tile cuts the repeat count roughly fourfold.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function HeroRays() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[110vh] [mask-image:linear-gradient(to_bottom,black_78%,transparent)] motion-reduce:hidden sm:block"
    >
      <SideRays
        origin="top-left"
        rayColor1="#C8EBFD"
        rayColor2="#8FB4E3"
        speed={1.2}
        intensity={2.6}
        spread={1.2}
        saturation={1}
        blend={0.6}
        falloff={1.05}
        opacity={1}
      />
      {/* The grain follows the light, and only the light.
          It used to be `inset-0` at 30% in `overlay`, covering the matte black
          as well — which contradicts the Localized-Light Rule above. Overlay
          against near-black does not add texture, it lifts the whole area to a
          grey veil, and the tile seams surface as visible banding.
          `soft-light` leaves blacks where they are, and the radial mask keeps
          the texture inside the halo. */}
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-soft-light [mask-image:radial-gradient(ellipse_70%_70%_at_0%_0%,black_0%,transparent_72%)]"
        style={{ backgroundImage: GRAIN }}
      />
    </div>
  );
}
