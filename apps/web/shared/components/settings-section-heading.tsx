import type { ReactNode } from "react";

// A section title in the workspace (DESIGN.md § 8): ui-section, after a
// hairline and 40px of air. Never capitals. Only above a genuine group of
// rows; a single row's own title already names it.
export function SettingsSectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-10 border-t border-hairline pt-10 pb-2 text-[1.0625rem] font-medium">
      {children}
    </h2>
  );
}
