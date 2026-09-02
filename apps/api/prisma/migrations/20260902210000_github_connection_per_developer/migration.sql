-- The GitHub authorization moves from the project's board to the developer's
-- account (docs/PRODUCT.md « Connexions et choix »). Existing board choices
-- carried a per-project token that no longer exists; there is no production
-- yet, so they are dropped and chosen again.

-- CreateTable
CREATE TABLE "github_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "needs_reconnect" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_connections_user_id_key" ON "github_connections"("user_id");

-- AddForeignKey
ALTER TABLE "github_connections" ADD CONSTRAINT "github_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Board choices are re-made with the developer's connection.
DELETE FROM "board_connections";

-- AlterTable
ALTER TABLE "board_connections" DROP COLUMN "encrypted_token",
DROP COLUMN "needs_reconnect",
ADD COLUMN     "connected_by_id" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "board_connections" ADD CONSTRAINT "board_connections_connected_by_id_fkey" FOREIGN KEY ("connected_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
