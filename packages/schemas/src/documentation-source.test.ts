import { describe, expect, it } from "vitest";
import {
  CreateNotionRootRequestSchema,
  NotionRootCandidateListSchema,
  DocumentAcknowledgementSchema,
  SourceDocumentDetailSchema,
  SourceDocumentPageSchema,
  SourceDocumentSchema,
  SourceDocumentStatusSchema,
} from "./documentation-source";

const UUID = "00000000-0000-4000-8000-000000000001";

const document = {
  id: UUID,
  kind: "upload" as const,
  status: "incorporated" as const,
  version: 1,
  title: "Cahier des charges",
  failureCode: null,
  createdAt: new Date().toISOString(),
};

describe("documentation source contracts", () => {
  it("validates a document and its detail", () => {
    expect(SourceDocumentSchema.parse(document).status).toBe("incorporated");
    expect(
      SourceDocumentDetailSchema.parse({
        ...document,
        originalFileName: "cdc.pdf",
        originalMimeType: "application/pdf",
        originalSizeBytes: 1024,
        originalDownloadUrl: "https://signed.example/cdc.pdf",
        externalUrl: null,
      }).originalFileName,
    ).toBe("cdc.pdf");
  });

  // A document is stored, read once, and in. There is no pipeline behind it any
  // more, so the states it used to pass through are not states it can be in.
  it("knows only the four states a document can be in", () => {
    expect(SourceDocumentStatusSchema.options).toEqual([
      "received",
      "incorporated",
      "failed",
      "removed",
    ]);
    expect(SourceDocumentStatusSchema.safeParse("extracting").success).toBe(
      false,
    );
  });

  // Adding a document no longer starts anything, so nothing is acknowledged
  // beyond the document itself.
  it("acknowledges the document and nothing else", () => {
    expect(
      DocumentAcknowledgementSchema.parse({ document }).document.id,
    ).toBe(UUID);
    expect(
      DocumentAcknowledgementSchema.safeParse({
        document,
        operation: { operationId: UUID, status: "queued" },
      }).success,
    ).toBe(false);
  });

  it("pages documents with an opaque cursor", () => {
    expect(
      SourceDocumentPageSchema.parse({
        items: [document],
        total: 1,
        nextCursor: null,
      }).total,
    ).toBe(1);
  });

  it("reads the pages the developer ticked, each with the document it already is here", () => {
    const parsed = NotionRootCandidateListSchema.safeParse({
      pages: [
        {
          id: "0123456789abcdef0123456789abcdef",
          title: "Cadrage",
          url: "https://notion.so/Cadrage",
          rootDocumentId: "6f1a1c3e-2b5d-4e7f-9a0b-1c2d3e4f5a6b",
        },
        {
          id: "fedcba9876543210fedcba9876543210",
          title: "Roadmap",
          url: "https://notion.so/Roadmap",
          rootDocumentId: null,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("refuses a racine request without a Notion page id", () => {
    expect(CreateNotionRootRequestSchema.safeParse({ pageId: "short" }).success).toBe(false);
    expect(
      CreateNotionRootRequestSchema.safeParse({ pageId: "zz".repeat(16) }).success,
    ).toBe(false);
    expect(
      CreateNotionRootRequestSchema.safeParse({
        pageId: "0123456789abcdef0123456789abcdef",
      }).success,
    ).toBe(true);
  });
});
