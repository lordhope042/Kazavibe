-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "archivedA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedB" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedB" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "hiddenA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenB" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;
