-- Step 1: Add projectId and backfill existing labels
ALTER TABLE "labels" ADD COLUMN "projectId" UUID;
UPDATE "labels" SET "projectId" = '56fe5aa3-da9b-4616-baa5-c1dbbae89995' WHERE "projectId" IS NULL;
ALTER TABLE "labels" ALTER COLUMN "projectId" SET NOT NULL;

-- Step 2: Add normalizedName and backfill
ALTER TABLE "labels" ADD COLUMN "normalizedName" TEXT;
UPDATE "labels" SET "normalizedName" = LOWER(TRIM("name")) WHERE "normalizedName" IS NULL;
ALTER TABLE "labels" ALTER COLUMN "normalizedName" SET NOT NULL;

-- Step 3: Add color, description, updatedAt
ALTER TABLE "labels" ADD COLUMN "color" TEXT NOT NULL DEFAULT 'cyan';
ALTER TABLE "labels" ADD COLUMN "description" TEXT;
ALTER TABLE "labels" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 4: Drop old constraints and columns
ALTER TABLE "labels" DROP CONSTRAINT IF EXISTS "labels_organizationId_name_key";
ALTER TABLE "labels" DROP CONSTRAINT IF EXISTS "labels_organizationId_fkey";
ALTER TABLE "labels" DROP COLUMN IF EXISTS "organizationId";
ALTER TABLE "labels" DROP COLUMN IF EXISTS "colorHex";

-- Step 5: Add indexes and constraints on labels
CREATE UNIQUE INDEX "labels_projectId_normalizedName_key" ON "labels"("projectId", "normalizedName");
CREATE INDEX "labels_projectId_idx" ON "labels"("projectId");
ALTER TABLE "labels" ADD CONSTRAINT "labels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add taskId index on task_labels
CREATE INDEX IF NOT EXISTS "task_labels_taskId_idx" ON "task_labels"("taskId");
