import { CheckCircle2, CircleDashed, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export type SetupTone = "waiting" | "live" | "unknown";

export interface SetupFeeds {
  /** What this input feeds — the client-facing thing that stays blocked without it. */
  label: ReactNode;
  /** The state, in the caller's own words: "En attente", "En service". */
  state: ReactNode;
  tone: SetupTone;
}

const TONE_ICON = {
  waiting: CircleDashed,
  live: CheckCircle2,
  unknown: HelpCircle,
} as const;

// An empty input says what stays blocked, not that it is empty.
// A void is a state and carries no priority; the same row naming what it feeds
// does — which is what makes one block obviously first without an accent
// colour, a badge or a step number anywhere on the screen.
//
// Deliberately dumb about words: the caller supplies `label` and `state` as
// text it owns, and this only decides layout and tone. A shared component that
// reached for its own translation namespace would put half of one screen's
// vocabulary somewhere nobody looking at that screen would think to look.
//
// Lives in shared/ because the documentation, board-connections and
// notion-connection features all need it and none may import another
// (Constitution III) — same reason as SettingsRow, beside which it sits.
export function SetupBlock({
  title,
  description,
  feeds,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Omitted for a control that blocks nothing — it then renders no line at all. */
  feeds?: SetupFeeds;
  children: ReactNode;
}) {
  const Icon = feeds ? TONE_ICON[feeds.tone] : null;

  return (
    <section className="flex flex-col gap-4 border-b border-hairline py-6 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-0.5 text-sm">
          <span className="text-base font-medium text-foreground">{title}</span>
          {description && <div className="text-[0.9375rem] text-fg-2">{description}</div>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      </div>

      {feeds && Icon && (
        <p
          className={cn(
            // Wraps under the control rather than pushing the block sideways,
            // which is what keeps this readable at 390px.
            // A solid hairline: the dotted separators are gone (DESIGN.md § 9).
            "flex flex-wrap items-center gap-2 border-t border-hairline pt-3 text-[0.8125rem]",
            feeds.tone === "live" ? "text-fg" : "text-fg-3",
          )}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span>{feeds.label}</span>
          <span
            className={cn(
              // The status badge register: text plus an alpha ground, no
              // border. Live is a success, the rest is neutral.
              "rounded-sm px-2 py-0.5 font-medium",
              feeds.tone === "live"
                ? "bg-success-bg text-success"
                : "bg-surface-2 text-fg-3",
            )}
          >
            {feeds.state}
          </span>
        </p>
      )}
    </section>
  );
}
