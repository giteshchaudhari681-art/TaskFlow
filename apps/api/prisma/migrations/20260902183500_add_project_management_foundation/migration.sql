-- AlterEnum
ALTER TYPE "ProjectRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "color" TEXT,
ADD COLUMN     "icon" TEXT;
