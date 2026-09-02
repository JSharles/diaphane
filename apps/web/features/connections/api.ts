import type { Connections } from "schemas";
import { apiFetch } from "@/shared/lib/api-client";

// The developer's connections, as the profile shows them. Connecting GitHub
// is the login itself; only reading and cutting go through here.
export function getConnections() {
  return apiFetch<Connections>("/connections");
}

export function disconnectGithub() {
  return apiFetch<void>("/connections/github", { method: "DELETE" });
}
