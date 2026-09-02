-- AlterTable
ALTER TABLE "subtasks" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "issueKey" TEXT;

-- CreateIndex
CREATE INDEX "tasks_issueKey_idx" ON "tasks"("issueKey");
