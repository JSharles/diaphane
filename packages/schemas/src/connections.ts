import { z } from 'zod';

// A developer's connections, as the profile shows them. Connecting GitHub is
// the login itself; the profile only reads the state and cuts it.
export const GithubConnectionStateSchema = z.object({
  connected: z.boolean(),
  // The board sweep found the token revoked; logging in again brings a fresh one.
  needsReconnect: z.boolean(),
});
export type GithubConnectionState = z.infer<typeof GithubConnectionStateSchema>;

export const ConnectionsSchema = z.object({
  github: GithubConnectionStateSchema,
});
export type Connections = z.infer<typeof ConnectionsSchema>;
