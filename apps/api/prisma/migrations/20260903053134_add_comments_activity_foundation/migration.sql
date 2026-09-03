-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_CREATED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_UPDATED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_STATUS_CHANGED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_PRIORITY_CHANGED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_UNASSIGNED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_LABEL_ADDED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_LABEL_REMOVED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_MILESTONE_CHANGED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_DEPENDENCY_ADDED';
ALTER TYPE "ActivityActionType" ADD VALUE 'TASK_DEPENDENCY_REMOVED';
ALTER TYPE "ActivityActionType" ADD VALUE 'COMMENT_CREATED';
ALTER TYPE "ActivityActionType" ADD VALUE 'COMMENT_UPDATED';
ALTER TYPE "ActivityActionType" ADD VALUE 'COMMENT_DELETED';
ALTER TYPE "ActivityActionType" ADD VALUE 'MILESTONE_CREATED';
ALTER TYPE "ActivityActionType" ADD VALUE 'MILESTONE_UPDATED';
ALTER TYPE "ActivityActionType" ADD VALUE 'MILESTONE_COMPLETED';

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "deletedAt" TIMESTAMP(3);
