-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('USER', 'SYSTEM', 'AI', 'AI_ASSISTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM (
    'AUTH_LOGIN',
    'AUTH_LOGOUT',
    'AUTH_REFRESH_REUSE_DETECTED',
    'AUTH_PASSWORD_CHANGED',
    'ORGANIZATION_CREATED',
    'ORGANIZATION_MEMBER_INVITED',
    'ORGANIZATION_MEMBER_ROLE_CHANGED',
    'ORGANIZATION_MEMBER_REMOVED',
    'PROJECT_CREATED',
    'PROJECT_UPDATED',
    'PROJECT_ARCHIVED',
    'PROJECT_MEMBER_ADDED',
    'PROJECT_MEMBER_ROLE_CHANGED',
    'PROJECT_MEMBER_REMOVED',
    'TASK_CREATED',
    'TASK_UPDATED',
    'TASK_STATUS_CHANGED',
    'TASK_PRIORITY_CHANGED',
    'TASK_ASSIGNED',
    'TASK_UNASSIGNED',
    'TASK_ARCHIVED',
    'COMMENT_CREATED',
    'COMMENT_UPDATED',
    'COMMENT_DELETED',
    'AI_ANALYSIS_REQUESTED',
    'AI_ACTION_PROPOSED',
    'AI_ACTION_APPLIED',
    'AI_ACTION_REJECTED'
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "actorUserId" UUID,
    "actorType" "ActorType" NOT NULL DEFAULT 'USER',
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId" TEXT,
    "source" "AuditSource" NOT NULL DEFAULT 'USER',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_organizationId_createdAt_idx" ON "audit_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_projectId_createdAt_idx" ON "audit_events"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_createdAt_idx" ON "audit_events"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_action_createdAt_idx" ON "audit_events"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_resourceType_resourceId_createdAt_idx" ON "audit_events"("resourceType", "resourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
