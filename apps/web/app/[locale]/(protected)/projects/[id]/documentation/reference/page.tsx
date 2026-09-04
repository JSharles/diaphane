"use client";

import { useTranslations } from "next-intl";
import { use } from "react";
import { ReferenceDocumentView } from "@/features/documentation/components/reference-document-view";

// Step 2 — what Diaphane understood. The centre of the product, no longer a
// section at the foot of the documents page but a place of its own.
// ReferenceDocumentView is moved, not rebuilt: prose with the
// open points inline, correction in place, the notes and the rewrite action.
export default function ReferenceStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("Projects.Documentation.Rail");

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {t("name_reference")}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("lead_reference")}
        </p>
      </div>
      <ReferenceDocumentView projectId={id} />
    </main>
  );
}
