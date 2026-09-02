import { apiFetch } from "@/shared/lib/api-client";

// Cutting a connection. Reading them is shared/api/connections.ts; connecting
// GitHub is the login itself and connecting Notion is a link to the API.
export function disconnectGithub() {
  return apiFetch<void>("/connections/github", { method: "DELETE" });
}

export function disconnectNotion() {
  return apiFetch<void>("/connections/notion", { method: "DELETE" });
}
