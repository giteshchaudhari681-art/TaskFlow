import { Prisma, AuditAction, ActorType, AuditSource, ProjectRole, UserRole } from '@prisma/client';
import { auditRepository, CreateAuditData } from '../repositories/audit.repository.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuditEventsFilter } from '@taskflow/shared';

// Sensitive keys forbidden from appearing in audit metadata
const SENSITIVE_KEY_PATTERNS = [
  /passw(or)?d/i,
  /token/i,
  /secret/i,
  /auth(oriz(ation)?)?/i,
  /cookie/i,
  /api[_-]?key/i,
  /refresh/i,
  /session/i,
  /private/i,
  /credential/i,
];

const MAX_METADATA_BYTES = 4096;

export interface RecordAuditInput {
  organizationId: string;
  projectId?: string | null;
  actorUserId?: string | null;
  actorType?: ActorType;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  requestId?: string | null;
  source?: AuditSource;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Deeply sanitizes metadata object by redacting sensitive keys and enforcing a strict byte-size boundary.
   */
  sanitizeMetadata(metadata?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const redact = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) {
        return obj.map(redact);
      }

      const clean: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
        if (isSensitive) {
          clean[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          clean[key] = redact(value);
        } else {
          clean[key] = value;
        }
      }
      return clean;
    };

    const sanitized = redact(metadata);
    const serialized = JSON.stringify(sanitized);

    if (serialized.length > MAX_METADATA_BYTES) {
      return {
        _truncated: true,
        summary: 'Metadata exceeded 4KB limit and was truncated for safety.',
      };
    }

    return sanitized;
  }

  /**
   * Appends an audit event to the historical audit trail.
   */
  async record(input: RecordAuditInput, tx?: Prisma.TransactionClient) {
    if (!input.organizationId) {
      throw new Error('AuditEvent requires an authoritative organizationId');
    }

    const sanitizedMetadata = this.sanitizeMetadata(input.metadata);

    const auditData: CreateAuditData = {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorType: input.actorType ?? ActorType.USER,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      requestId: input.requestId ?? null,
      source: input.source ?? AuditSource.USER,
      metadata: sanitizedMetadata,
    };

    return auditRepository.create(auditData, tx);
  }

  /**
   * Queries audit events with tenant isolation and role-based access control.
   * - Organization OWNER / ADMIN: can view all organization audit events.
   * - Project ADMIN: can only view audit events within their administered project(s).
   * - Organization MEMBER / VIEWER: forbidden.
   */
  async list(organizationId: string, filter: AuditEventsFilter, actorUserId: string) {
    // 1. Verify organization membership
    const orgMember = await organizationRepository.findMember(organizationId, actorUserId);
    if (!orgMember) {
      throw new AppError('FORBIDDEN', 'User does not belong to this organization', 403);
    }

    const isOrgAdmin = orgMember.role === UserRole.OWNER || orgMember.role === UserRole.ADMIN;

    if (isOrgAdmin) {
      // If project filter is requested, verify project belongs to this organization
      if (filter.projectId) {
        const project = await projectRepository.findById(filter.projectId, organizationId);
        if (!project) {
          throw new AppError('NOT_FOUND', 'Project not found in this organization', 404);
        }
      }
      return auditRepository.findMany(organizationId, filter);
    }

    // 2. For non-org admins: check if actor is Project ADMIN on any projects in this org
    const userMemberships = await projectRepository.findUserMemberships(
      organizationId,
      actorUserId
    );
    const adminProjectIds = userMemberships
      .filter(m => m.role === ProjectRole.ADMIN || m.role === ProjectRole.LEAD)
      .map(m => m.projectId);

    if (adminProjectIds.length === 0) {
      throw new AppError(
        'FORBIDDEN',
        'Viewing audit events requires Organization Administrator or Project Administrator privileges',
        403
      );
    }

    // If specific projectId requested, ensure it belongs to their administered projects
    if (filter.projectId) {
      if (!adminProjectIds.includes(filter.projectId)) {
        throw new AppError(
          'FORBIDDEN',
          'You are not an administrator for the requested project',
          403
        );
      }
      return auditRepository.findMany(organizationId, filter);
    }

    // Otherwise scope query strictly to their administered project IDs
    return auditRepository.findMany(organizationId, {
      ...filter,
      projectIds: adminProjectIds,
    });
  }
}

export const auditService = new AuditService();
