-- Recomposing a roadmap no longer starts from scratch: the model receives the
-- roadmap in place next to the reference document, and the proposal remembers
-- which one that was (docs/PRODUCT.md « La roadmap »). Earlier proposals were
-- all composed from the document alone; there is no production yet.

-- AlterTable
ALTER TABLE "section_proposals" ADD COLUMN "based_on_proposal_id" UUID;

-- AddForeignKey
ALTER TABLE "section_proposals" ADD CONSTRAINT "section_proposals_based_on_proposal_id_fkey" FOREIGN KEY ("based_on_proposal_id") REFERENCES "section_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
