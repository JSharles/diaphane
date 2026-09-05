"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDocumentationWorkspace, useReferenceSummary } from "../hooks";

// One door. The documents this runs on are a setting behind it, not a second
// feature beside it: the developer came to give their client something to read,
// not to manage files.
export function DocumentationSummaryCard({ projectId }: { projectId: string }) {
  const t = useTranslations("Projects.Documentation.Entry");
  const workspace = useDocumentationWorkspace(projectId);
  const summary = useReferenceSummary(projectId);

  const documentCount = summary.data?.documentCount ?? 0;
  const status = summary.data?.document?.status;
  const priority = workspace.data?.priority ?? "empty";

  // Before a reference document exists there is nothing to say about sections,
  // so the card says what the project is actually waiting for.
  const state =
    documentCount === 0
      ? t("stateNoDocuments")
      : status === "writing"
        ? t("stateWriting")
        : status !== "ready"
          ? t("stateNotWritten")
          : t(`priority_${priority}`);

  const attention =
    status === "failed" ||
    (status === "ready" &&
      (priority === "needs_action" || priority === "needs_attention"));
  // No spinner (DESIGN.md § 5): a write in progress is said in words, and
  // the icon stays still.
  const StatusIcon = attention ? AlertTriangle : status === "writing" ? Clock : CheckCircle2;

  return (
    <section className="border-b border-hairline py-6">
      <Link
        href={`/projects/${projectId}/documentation`}
        className="group flex items-center gap-4 rounded-lg border border-hairline bg-card px-6 py-5 transition-colors duration-fast hover:border-hairline-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium">{t("title")}</span>
          <span
            className={`mt-1 flex items-center gap-2 text-[0.8125rem] ${
              attention ? "text-warning" : "text-fg-3"
            }`}
          >
            <StatusIcon className="size-3.5 shrink-0" />
            <span>{state}</span>
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-fg-3" aria-hidden="true" />
      </Link>
    </section>
  );
}
