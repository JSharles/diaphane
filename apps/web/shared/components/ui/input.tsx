import * as React from "react"

import { cn } from "@/shared/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // DESIGN.md § 6 Champ: surface-1 on a strong hairline, 15px text, the
        // placeholder on the third text level, no shadow. Focus lifts the
        // border to text-2 and adds the 2px ring.
        "h-9 w-full min-w-0 rounded-md border border-input bg-surface-1 px-3 py-1 text-[0.9375rem] text-fg transition-[color,border-color,box-shadow] duration-fast ease-out-quiet outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-fg-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.38]",
        "focus-visible:border-fg-2 focus-visible:ring-2 focus-visible:ring-ring",
        "aria-invalid:border-danger aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
