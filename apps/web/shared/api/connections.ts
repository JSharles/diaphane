import type { Connections } from "schemas";
import { API_URL, apiFetch } from "../lib/api-client";

// The developer's connections. Read from shared/ because the profile, the
// project's Notion card and the documentation dialog all need to know what
// is connected; only features/connections cuts one.
export function getConnections() {
  return apiFetch<Connections>("/connections");
}

// « Connecter Notion »: a real navigation to the API, which opens Notion's own
// page picker and comes back to `returnTo` — the in-app path of the card the
// button sits on. The same link connects, reconnects, and ticks more pages.
export function notionConnectUrl(locale: string, returnTo: string) {
  const params = new URLSearchParams({ locale, returnTo });
  return `${API_URL}/connections/notion?${params.toString()}`;
}
