import { z } from 'zod';

// A board the developer's GitHub connection can see, for them to pick from.
// Nothing is persisted until the board is chosen.
export const AvailableBoardSchema = z.object({
  ownerLogin: z.string(),
  ownerType: z.enum(['User', 'Organization']),
  number: z.number().int().positive(),
  title: z.string(),
  url: z.url(),
});
export type AvailableBoard = z.infer<typeof AvailableBoardSchema>;

// How the board's numeric "Estimate" field reads as a duration.
export const EstimateUnitSchema = z.enum(['days', 'hours']);
export type EstimateUnit = z.infer<typeof EstimateUnitSchema>;

// The board a project chooses. No token: the developer's GitHub connection,
// given at login, reads it. estimateUnit defaults to "days" server-side.
export const CreateBoardConnectionRequestSchema = z.object({
  ownerLogin: z.string(),
  ownerType: z.enum(['User', 'Organization']),
  number: z.number().int().positive(),
  estimateUnit: EstimateUnitSchema.optional(),
});
export type CreateBoardConnectionRequest = z.infer<typeof CreateBoardConnectionRequestSchema>;

// The one thing a project changes on its board without choosing it again:
// how the board's numeric "Estimate" reads as a duration.
export const UpdateBoardConnectionRequestSchema = z.object({
  estimateUnit: EstimateUnitSchema,
});
export type UpdateBoardConnectionRequest = z.infer<typeof UpdateBoardConnectionRequestSchema>;

// The project's board choice, as the developer sees it.
export const BoardConnectionSchema = z.object({
  provider: z.literal('github'),
  boardOwnerLogin: z.string(),
  boardOwnerType: z.enum(['User', 'Organization']),
  boardNumber: z.number(),
  boardTitle: z.string(),
  boardUrl: z.url(),
  estimateUnit: EstimateUnitSchema,
  // The developer who chose this board has no usable GitHub connection any
  // more (cut, or revoked): the board is named but no longer read.
  needsReconnect: z.boolean(),
});
export type BoardConnection = z.infer<typeof BoardConnectionSchema>;
