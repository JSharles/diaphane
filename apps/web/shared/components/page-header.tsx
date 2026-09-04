import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

// The workspace page header (DESIGN.md § 8): a breadcrumb in ui-meta on the
// third text level, the title in the voice (Spectral, voice-page), and the
// one primary action of the page on the title's line, to the right.
export function PageHeader({
  backHref,
  backLabel,
  title,
  action,
}: {
  backHref?: string;
  backLabel?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 ui-meta text-fg-3 transition-colors duration-fast hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="min-w-0 truncate font-serif text-3xl leading-[1.15] font-normal">{title}</h1>
        {action}
      </div>
    </div>
  );
}
