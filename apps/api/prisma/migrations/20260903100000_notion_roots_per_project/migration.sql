-- A racine Notion is a source document that remembers which page it is the
-- subtree of (docs/PRODUCT.md « La base documentaire »). Documents added by
-- pasted URL before this column existed keep their snapshot and simply have
-- no page id; there is no production yet.

-- AlterTable
ALTER TABLE "source_documents" ADD COLUMN "notion_page_id" TEXT;

-- CreateIndex
CREATE INDEX "source_documents_project_id_notion_page_id_idx" ON "source_documents"("project_id", "notion_page_id");
