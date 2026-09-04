"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import GlassSurface from "@/shared/components/GlassSurface";

// GlassSurface probes the browser (CSS.supports, matchMedia) during render,
// so server HTML can never match the client — rendering it on first paint
// is a guaranteed hydration mismatch. First render (server AND first client
// pass) is therefore a plain static glass strip with the same geometry;
// the live surface mounts right after. Progressive enhancement, exactly the
// Effect-Removal Test: the bar is complete without the effect.
// Mount gate without an effect: false on the server and during hydration,
// true afterwards — the lint-sanctioned shape for progressive enhancement.
const subscribeNoop = () => () => {};

export function GlassBar({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <div className="mx-auto flex h-16 max-w-6xl items-center rounded-2xl border border-white/8 bg-pane p-2 backdrop-blur-sm">
        {children}
      </div>
    );
  }
  return (
    <GlassSurface
      width="100%"
      height={64}
      borderRadius={16}
      // A narrow refraction band: the wide default drew a visible ring at
      // the edge instead of bending what passes under it.
      borderWidth={0.03}
      className="mx-auto max-w-6xl"
    >
      {children}
    </GlassSurface>
  );
}
