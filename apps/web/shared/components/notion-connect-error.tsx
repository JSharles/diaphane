"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

// What the Notion callback says when the connection did not happen: the API
// sends the developer back to the card they pressed with `notion_error` set.
// Shared by the profile and the project card, so the wording lives once.
export function NotionConnectError() {
  const t = useTranslations("Connections.NotionError");
  const reason = useSearchParams().get("notion_error");

  if (reason !== "denied" && reason !== "failed") {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      {t(reason)}
    </p>
  );
}
