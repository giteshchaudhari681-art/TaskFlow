-- CreateIndex
CREATE INDEX "projects_organizationId_archivedAt_idx" ON "projects"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "tasks_projectId_archivedAt_idx" ON "tasks"("projectId", "archivedAt");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_archivedAt_idx" ON "tasks"("assigneeId", "archivedAt");
