-- AlterTable
ALTER TABLE "task_dependencies" ADD COLUMN "projectId" UUID;

-- Backfill existing dependencies with predecessor task's projectId
UPDATE "task_dependencies" td
SET "projectId" = t."projectId"
FROM "tasks" t
WHERE td."predecessorId" = t."id";

-- Defensive backfill from successor if predecessor was null
UPDATE "task_dependencies" td
SET "projectId" = t."projectId"
FROM "tasks" t
WHERE td."projectId" IS NULL AND td."successorId" = t."id";

-- AlterColumn: make projectId NOT NULL
ALTER TABLE "task_dependencies" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "task_dependencies_projectId_idx" ON "task_dependencies"("projectId");

-- CreateIndex
CREATE INDEX "task_dependencies_predecessorId_idx" ON "task_dependencies"("predecessorId");

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_prevent_self_dep" CHECK ("predecessorId" != "successorId");
