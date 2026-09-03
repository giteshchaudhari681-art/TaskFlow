/*
  Warnings:

  - You are about to drop the column `progressPercent` on the `milestones` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "milestones_projectId_dueDate_idx";

-- AlterTable
ALTER TABLE "labels" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "milestones" DROP COLUMN "progressPercent",
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "milestones_projectId_displayOrder_dueDate_idx" ON "milestones"("projectId", "displayOrder", "dueDate");
