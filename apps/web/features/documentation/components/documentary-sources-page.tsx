"use client";

import { ChevronRight, FilePlus2, FileText, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { SourceDocument } from "schemas";
import { Link } from "@/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useDocumentationDocuments } from "../hooks";
import { AddDocumentDialog } from "./add-document-dialog";
import { DocumentStatus } from "./document-status";
import { RemoveDocumentDialog } from "./remove-document-dialog";

// A document is read once at upload and then it is in. There is nothing to
// stop, nothing to retry and no removal to resume: the only thing left to do
// with a document is take it back out.
function DocumentActions({
  document,
  onRemove,
}: {
  document: SourceDocument;
  onRemove: () => void;
}) {
  const t = useTranslations("Projects.Documentation.Base");

  if (document.status === "removed") return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="shrink-0 text-muted-foreground hover:text-destructive"
      onClick={onRemove}
    >
      <Trash2 />
      {t("remove")}
    </Button>
  );
}

// Step 1 — what the developer hands over. The reference document left for its
// own step, and the gate/back-link/title chrome for the layout:
// this panel is the document list and add/remove, nothing else.
export function DocumentarySourcesPage({ projectId }: { projectId: string }) {
  const t = useTranslations("Projects.Documentation.Base");
  const documents = useDocumentationDocuments(projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [removalDocumentId, setRemovalDocumentId] = useState<string | null>(
    null,
  );
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const items = documents.data?.items ?? [];

  return (
    <main className="flex flex-col gap-6">
      <section aria-labelledby="documents-title" className="print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="documents-title"
              className="text-lg font-semibold tracking-tight"
            >
              {t("documentsTitle")}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t("documentsDescription")}
            </p>
          </div>
          <Button
            ref={addButtonRef}
            type="button"
            variant="outline"
            onClick={() => setAddOpen(true)}
          >
            <FilePlus2 />
            {t("add")}
          </Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {documents.isPending ? (
            <div className="p-4">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : documents.isError ? (
            // A failed request is not an empty base.
            <p role="alert" className="p-5 text-sm text-destructive">
              {t("documentsLoadError")}
            </p>
          ) : items.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">{t("emptyTitle")}</p>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {t("emptyDescription")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((document) => (
                <li
                  key={document.id}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* One link per row, and its accessible name is the title
                        alone: the status used to sit inside the anchor, so the
                        link renamed itself on every poll. */}
                    <Link
                      href={`/projects/${projectId}/documentation/sources/${document.id}`}
                      title={document.title}
                      className="block truncate rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {document.title}
                    </Link>
                    <DocumentStatus status={document.status} className="mt-1" />
                  </span>
                  <DocumentActions
                    document={document}
                    onRemove={() => setRemovalDocumentId(document.id)}
                  />
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </li>
              ))}
            </ul>
          )}
          {documents.hasNextPage && (
            <div className="border-t border-border p-4 sm:px-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={documents.isFetchingNextPage}
                onClick={() => void documents.fetchNextPage()}
              >
                {t(documents.isFetchingNextPage ? "loadingMore" : "loadMore")}
              </Button>
            </div>
          )}
        </div>
      </section>

      <AddDocumentDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      <RemoveDocumentDialog
        projectId={projectId}
        documentId={removalDocumentId}
        open={Boolean(removalDocumentId)}
        onOpenChange={(open) => {
          if (open) return;
          setRemovalDocumentId(null);
          // The row that opened this dialog may no longer exist, so focus goes
          // back to something that certainly does.
          addButtonRef.current?.focus();
        }}
      />
    </main>
  );
}
