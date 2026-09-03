-- A published roadmap is no longer read-only: a correction to it opens a
-- proposal prefilled with the corrected roadmap, without calling the model, so
-- a proposal may have no generation operation behind it (docs/PRODUCT.md « La
-- roadmap »). Every proposal so far was composed; there is no production yet.

-- AlterTable
ALTER TABLE "section_proposals" ALTER COLUMN "generation_operation_id" DROP NOT NULL;
