import { use } from "react";
import { ClientContentPage } from "@/features/documentation/components/client-content-page";

// Step 3 — the rubriques. The workspace itself is unchanged; it moved from the
// feature root to its own step.
export default function SectionsStepPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClientContentPage projectId={id} />;
}
