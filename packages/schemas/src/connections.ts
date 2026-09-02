import { z } from 'zod';

// A developer's connections, as the profile shows them. Connecting GitHub is
// the login itself; connecting Notion is the « Connecter Notion » button,
// which opens Notion's own page picker. The profile reads the state of both
// and cuts either.
export const GithubConnectionStateSchema = z.object({
  connected: z.boolean(),
  // The board sweep found the token revoked; logging in again brings a fresh one.
  needsReconnect: z.boolean(),
});
export type GithubConnectionState = z.infer<typeof GithubConnectionStateSchema>;

export const NotionConnectionStateSchema = z.object({
  connected: z.boolean(),
  // Notion refused to refresh the token pair; pressing the button again heals it.
  needsReconnect: z.boolean(),
  // The workspace the developer picked pages in — null when nothing is connected.
  workspaceName: z.string().nullable(),
});
export type NotionConnectionState = z.infer<typeof NotionConnectionStateSchema>;

export const ConnectionsSchema = z.object({
  github: GithubConnectionStateSchema,
  notion: NotionConnectionStateSchema,
});
export type Connections = z.infer<typeof ConnectionsSchema>;
