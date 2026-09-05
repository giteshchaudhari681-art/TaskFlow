import { SearchResultItem, SearchResponse, SearchQueryFilter } from '@taskflow/shared';
import { UserRole } from '@prisma/client';
import { searchRepository } from '../repositories/search.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { AppError } from '../middleware/errorHandler.js';

export class SearchService {
  /**
   * Determine project IDs accessible to the user within the organization.
   * - OWNER & ADMIN can access all projects in the organization.
   * - MEMBER & GUEST can only access projects where they have an explicit ProjectMember record.
   */
  async getAccessibleProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const orgMember = await organizationRepository.findMember(organizationId, userId);
    if (!orgMember) {
      throw new AppError('FORBIDDEN', 'You do not have access to this organization workspace', 403);
    }

    if (orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN) {
      return searchRepository.findAllOrgProjectIds(organizationId);
    }

    const memberships = await searchRepository.findUserProjectMemberships(organizationId, userId);
    return memberships.map(m => m.projectId);
  }

  /**
   * Global search across organization entities with deterministic ranking,
   * strict tenant boundary isolation, and project access rules.
   */
  async search(
    organizationId: string,
    userId: string,
    filter: SearchQueryFilter
  ): Promise<SearchResponse> {
    const rawQuery = filter.q.trim();
    const queryLower = rawQuery.toLowerCase();
    const typeFilter = filter.type || 'all';
    const limit = Math.min(Math.max(filter.limit || 20, 1), 100);

    // Fetch accessible project IDs for the user in this organization
    let accessibleProjectIds = await this.getAccessibleProjectIds(organizationId, userId);

    // If a specific project was requested, scope to that project only if user has access
    if (filter.projectId) {
      if (!accessibleProjectIds.includes(filter.projectId)) {
        // User does not have access to the requested project -> secure return empty
        return {
          query: rawQuery,
          total: 0,
          hasMore: false,
          results: [],
          counts: {
            projects: 0,
            tasks: 0,
            milestones: 0,
            users: 0,
            labels: 0,
          },
        };
      }
      accessibleProjectIds = [filter.projectId];
    }

    const fetchAll = typeFilter === 'all';
    const shouldFetchProjects = fetchAll || typeFilter === 'project';
    const shouldFetchTasks = fetchAll || typeFilter === 'task';
    const shouldFetchMilestones = fetchAll || typeFilter === 'milestone';
    const shouldFetchUsers = fetchAll || typeFilter === 'user';
    const shouldFetchLabels = fetchAll || typeFilter === 'label';

    // Per-entity fetch limits (fetch extra to compute hasMore, capped at 100)
    const entityLimit = Math.min(Math.max(limit, 10), 100);

    const [projects, tasks, milestones, users, labels] = await Promise.all([
      shouldFetchProjects
        ? searchRepository.searchProjects(
            organizationId,
            filter.projectId ? [filter.projectId] : accessibleProjectIds,
            rawQuery,
            entityLimit
          )
        : Promise.resolve([]),
      shouldFetchTasks
        ? searchRepository.searchTasks(accessibleProjectIds, rawQuery, entityLimit)
        : Promise.resolve([]),
      shouldFetchMilestones
        ? searchRepository.searchMilestones(accessibleProjectIds, rawQuery, entityLimit)
        : Promise.resolve([]),
      shouldFetchUsers && !filter.projectId
        ? searchRepository.searchUsers(organizationId, rawQuery, entityLimit)
        : Promise.resolve([]),
      shouldFetchLabels
        ? searchRepository.searchLabels(accessibleProjectIds, rawQuery, entityLimit)
        : Promise.resolve([]),
    ]);

    const scoredResults: SearchResultItem[] = [];

    // 1. Process Task Results
    for (const task of tasks) {
      let score = 50;
      const issueKey = task.issueKey?.toUpperCase();
      const titleLower = task.title.toLowerCase();

      if (issueKey && issueKey === queryLower.toUpperCase()) {
        score = 100; // Exact issue key match
      } else if (titleLower === queryLower) {
        score = 90; // Exact title match
      } else if (titleLower.startsWith(queryLower)) {
        score = 75; // Prefix match
      } else if (issueKey && issueKey.includes(queryLower.toUpperCase())) {
        score = 70; // Issue key partial match
      } else if (titleLower.includes(queryLower)) {
        score = 60; // Title substring match
      } else {
        score = 40; // Description match
      }

      scoredResults.push({
        id: task.id,
        type: 'task',
        title: task.title,
        subtitle: `${task.project.name} • ${task.issueKey || `#${task.taskNumber}`}`,
        description: task.description,
        url: `/projects/${task.projectId}/tasks/${task.id}`,
        score,
        metadata: {
          projectId: task.projectId,
          projectName: task.project.name,
          projectKey: task.project.key,
          taskNumber: task.taskNumber,
          issueKey: task.issueKey || undefined,
          status: task.status,
          priority: task.priority,
          assigneeName: task.assignee?.name,
          assigneeAvatar: task.assignee?.avatarUrl,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        },
      });
    }

    // 2. Process Project Results
    for (const project of projects) {
      let score = 50;
      const nameLower = project.name.toLowerCase();
      const keyLower = project.key.toLowerCase();

      if (keyLower === queryLower) {
        score = 98; // Exact key match
      } else if (nameLower === queryLower) {
        score = 92; // Exact name match
      } else if (nameLower.startsWith(queryLower)) {
        score = 78; // Prefix match
      } else if (keyLower.includes(queryLower)) {
        score = 72; // Key partial match
      } else if (nameLower.includes(queryLower)) {
        score = 65; // Name substring match
      } else {
        score = 40; // Description match
      }

      scoredResults.push({
        id: project.id,
        type: 'project',
        title: project.name,
        subtitle: `Project key: ${project.key} • Status: ${project.status}`,
        description: project.description,
        url: `/projects/${project.id}`,
        score,
        metadata: {
          projectId: project.id,
          projectName: project.name,
          projectKey: project.key,
          status: project.status,
          color: project.color || undefined,
        },
      });
    }

    // 3. Process Milestone Results
    for (const milestone of milestones) {
      let score = 50;
      const titleLower = milestone.title.toLowerCase();

      if (titleLower === queryLower) {
        score = 88;
      } else if (titleLower.startsWith(queryLower)) {
        score = 74;
      } else if (titleLower.includes(queryLower)) {
        score = 58;
      } else {
        score = 38;
      }

      scoredResults.push({
        id: milestone.id,
        type: 'milestone',
        title: milestone.title,
        subtitle: `${milestone.project.name} • Status: ${milestone.status}`,
        description: milestone.description,
        url: `/projects/${milestone.projectId}?tab=timeline&milestoneId=${milestone.id}`,
        score,
        metadata: {
          projectId: milestone.projectId,
          projectName: milestone.project.name,
          projectKey: milestone.project.key,
          status: milestone.status,
          dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
        },
      });
    }

    // 4. Process User Results
    for (const member of users) {
      let score = 50;
      const nameLower = member.user.name.toLowerCase();
      const emailLower = member.user.email.toLowerCase();

      if (emailLower === queryLower) {
        score = 95;
      } else if (nameLower === queryLower) {
        score = 90;
      } else if (nameLower.startsWith(queryLower)) {
        score = 75;
      } else if (nameLower.includes(queryLower)) {
        score = 60;
      } else {
        score = 50;
      }

      scoredResults.push({
        id: member.user.id,
        type: 'user',
        title: member.user.name,
        subtitle: `${member.user.email} • ${member.role}`,
        url: `/settings?tab=members&userId=${member.user.id}`,
        score,
        metadata: {
          email: member.user.email,
          role: member.role,
          assigneeAvatar: member.user.avatarUrl,
        },
      });
    }

    // 5. Process Label Results
    for (const label of labels) {
      let score = 50;
      const nameLower = label.name.toLowerCase();

      if (nameLower === queryLower) {
        score = 85;
      } else if (nameLower.startsWith(queryLower)) {
        score = 70;
      } else {
        score = 55;
      }

      scoredResults.push({
        id: label.id,
        type: 'label',
        title: label.name,
        subtitle: `${label.project.name} • Label`,
        description: label.description,
        url: `/projects/${label.projectId}?tab=labels&labelId=${label.id}`,
        score,
        metadata: {
          projectId: label.projectId,
          projectName: label.project.name,
          color: label.color,
        },
      });
    }

    // Deterministic Sorting:
    // 1. Score descending
    // 2. Title ascending
    // 3. ID ascending
    scoredResults.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const titleCompare = a.title.localeCompare(b.title);
      if (titleCompare !== 0) {
        return titleCompare;
      }
      return a.id.localeCompare(b.id);
    });

    const total = scoredResults.length;
    const hasMore = total > limit;
    const paginatedResults = scoredResults.slice(0, limit);

    const counts = {
      projects: projects.length,
      tasks: tasks.length,
      milestones: milestones.length,
      users: users.length,
      labels: labels.length,
    };

    return {
      query: rawQuery,
      total,
      hasMore,
      results: paginatedResults,
      counts,
    };
  }
}

export const searchService = new SearchService();
