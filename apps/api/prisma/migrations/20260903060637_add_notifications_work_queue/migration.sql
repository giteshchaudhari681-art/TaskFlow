-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_UNASSIGNED', 'COMMENT_CREATED', 'TASK_STATUS_CHANGED', 'TASK_PRIORITY_CHANGED', 'TASK_MILESTONE_CHANGED', 'TASK_DEPENDENCY_ADDED', 'TASK_DEPENDENCY_REMOVED', 'MILESTONE_COMPLETED', 'SYSTEM');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "actorId" UUID,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "projectId" UUID,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "taskId" UUID,
ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationPreferences" JSONB;

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
