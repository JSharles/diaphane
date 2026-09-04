import * as React from "react"

import { cn } from "@/shared/lib/utils"

// DESIGN.md § 6 Barre de progression: 2px, a hairline track, the text
// colour as fill. No colour: the number beside it carries the meaning.
function Progress({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      data-slot="progress"
      className={cn("h-0.5 w-full overflow-hidden rounded-full bg-hairline", className)}
      {...props}
    >
      <div
        data-slot="progress-fill"
        className="h-full rounded-full bg-fg transition-[width] duration-enter ease-out-quiet"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export { Progress }
