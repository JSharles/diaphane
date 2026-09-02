import { z } from "zod";
import { DocumentationUuidSchema, createCursorPageSchema } from "./documentation-common";

export const SourceDocumentKindSchema = z.enum(["upload", "notion"]);

// A document is stored, read once to check it can be read at all, and then it
// is part of the corpus. Nothing else happens to it: every reference write
// re-reads the originals, so there is no pipeline behind a document any more
// (specs/018).
export const SourceDocumentStatusSchema = z.enum([
  "received",
  "incorporated",
  "failed",
  "removed",
]);

export const SourceDocumentSchema = z
  .object({
    id: DocumentationUuidSchema,
    kind: SourceDocumentKindSchema,
    status: SourceDocumentStatusSchema,
    version: z.number().int().positive(),
    title: z.string().trim().min(1),
    failureCode: z.string().trim().min(1).max(128).nullable(),
    createdAt: z.iso.datetime(),
  })
  .strict();

export const SourceDocumentDetailSchema = SourceDocumentSchema.extend({
  originalFileName: z.string().nullable(),
  originalMimeType: z.string().nullable(),
  originalSizeBytes: z.number().int().nonnegative().nullable(),
  originalDownloadUrl: z.url().nullable(),
  externalUrl: z.url().nullable(),
}).strict();

export const SourceDocumentPageSchema =
  createCursorPageSchema(SourceDocumentSchema);

// Adding a document no longer starts anything: it is readable, it is stored,
// it is in. What it leaves behind is a reference document owed a rewrite.
export const DocumentAcknowledgementSchema = z
  .object({ document: SourceDocumentSchema })
  .strict();

// A page the developer ticked in Notion — a racine this project may choose —
// and the document it already is here when it is one.
export const NotionRootCandidateSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: z.url(),
    rootDocumentId: DocumentationUuidSchema.nullable(),
  })
  .strict();

export const NotionRootCandidateListSchema = z
  .object({ pages: z.array(NotionRootCandidateSchema) })
  .strict();

// A Notion page id as `POST /v1/search` returns it: a uuid, dashed or not.
export const NotionPageIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/iu);

export const CreateNotionRootRequestSchema = z
  .object({ pageId: NotionPageIdSchema })
  .strict();

export type SourceDocument = z.infer<typeof SourceDocumentSchema>;
export type SourceDocumentDetail = z.infer<typeof SourceDocumentDetailSchema>;
export type DocumentAcknowledgement = z.infer<
  typeof DocumentAcknowledgementSchema
>;
export type NotionRootCandidate = z.infer<typeof NotionRootCandidateSchema>;
export type NotionRootCandidateList = z.infer<typeof NotionRootCandidateListSchema>;
export type CreateNotionRootRequest = z.infer<typeof CreateNotionRootRequestSchema>;
