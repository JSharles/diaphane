-- The Notion authorization moves from the project to the developer's account
-- (docs/PRODUCT.md « Connexions et choix »): a « Connecter Notion » button in
-- place of a pasted secret, with a token pair Notion can refresh. The
-- project-scoped table held pasted tokens that no longer exist; there is no
-- production yet, so it is dropped and rebuilt.

-- DropTable
DROP TABLE "notion_connections";

-- CreateTable
CREATE TABLE "notion_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT,
    "workspace_id" TEXT NOT NULL,
    "workspace_name" TEXT,
    "needs_reconnect" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notion_connections_user_id_key" ON "notion_connections"("user_id");

-- AddForeignKey
ALTER TABLE "notion_connections" ADD CONSTRAINT "notion_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
