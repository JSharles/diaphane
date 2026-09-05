import type { ReactNode } from "react";

// A section title in the workspace (DESIGN.md § 8): after a hairline and
// 40px of air. The hairline is the one the last row above already draws, so
// this adds none of its own: two lines with a gap between them read as a
// mistake, not as a separation.
export function SettingsSectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 pb-2 text-[1.0625rem] font-medium">{children}</h2>;
}
