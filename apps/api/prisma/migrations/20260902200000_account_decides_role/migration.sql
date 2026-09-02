-- The account (users.account_kind) is the only place that says who is a
-- developer and who is a client. Drop what duplicated it and what nothing
-- ever read or wrote (docs/PRODUCT.md « Modèle de données »).

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assignee_id_fkey";
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_project_id_fkey";

-- DropTable
DROP TABLE "tasks";

-- AlterTable
ALTER TABLE "invitations" DROP COLUMN "role";
ALTER TABLE "project_members" DROP COLUMN "role";
ALTER TABLE "projects" DROP COLUMN "status";
ALTER TABLE "users" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ProjectMemberRole";
