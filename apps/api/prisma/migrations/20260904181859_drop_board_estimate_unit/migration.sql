-- The board's "Estimate" is a number of days. Asking the developer to pick
-- days or hours produced a control nobody moved, so the choice is gone: the
-- column and its enum go with it.
ALTER TABLE "board_connections" DROP COLUMN "estimate_unit";

DROP TYPE "EstimateUnit";
