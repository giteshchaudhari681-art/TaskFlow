import { BaseRepository } from './base.repository.js';

export class LabelRepository extends BaseRepository {
  async create(
    projectId: string,
    data: {
      name: string;
      normalizedName: string;
      color?: string;
      description?: string | null;
    }
  ) {
    return this.db.label.create({
      data: {
        projectId,
        name: data.name,
        normalizedName: data.normalizedName,
        color: data.color || 'cyan',
        description: data.description,
      },
      include: {
        _count: {
          select: { taskLabels: true },
        },
      },
    });
  }

  async listByProject(projectId: string) {
    const labels = await this.db.label.findMany({
      where: { projectId },
      orderBy: [{ name: 'asc' }],
      include: {
        _count: {
          select: { taskLabels: true },
        },
      },
    });

    return labels.map(l => ({
      id: l.id,
      projectId: l.projectId,
      name: l.name,
      normalizedName: l.normalizedName,
      color: l.color,
      description: l.description,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
      taskCount: l._count.taskLabels,
    }));
  }

  async findById(id: string, projectId: string) {
    const label = await this.db.label.findFirst({
      where: { id, projectId },
      include: {
        _count: {
          select: { taskLabels: true },
        },
      },
    });

    if (!label) return null;

    return {
      id: label.id,
      projectId: label.projectId,
      name: label.name,
      normalizedName: label.normalizedName,
      color: label.color,
      description: label.description,
      createdAt: label.createdAt.toISOString(),
      updatedAt: label.updatedAt.toISOString(),
      taskCount: label._count.taskLabels,
    };
  }

  async findByNormalizedName(projectId: string, normalizedName: string) {
    return this.db.label.findUnique({
      where: {
        projectId_normalizedName: {
          projectId,
          normalizedName,
        },
      },
    });
  }

  async update(
    id: string,
    projectId: string,
    data: {
      name?: string;
      normalizedName?: string;
      color?: string;
      description?: string | null;
    }
  ) {
    const updated = await this.db.label.update({
      where: { id, projectId },
      data: {
        name: data.name,
        normalizedName: data.normalizedName,
        color: data.color,
        description: data.description,
      },
      include: {
        _count: {
          select: { taskLabels: true },
        },
      },
    });

    return {
      id: updated.id,
      projectId: updated.projectId,
      name: updated.name,
      normalizedName: updated.normalizedName,
      color: updated.color,
      description: updated.description,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      taskCount: updated._count.taskLabels,
    };
  }

  async delete(id: string, projectId: string) {
    return this.db.label.delete({
      where: { id, projectId },
    });
  }
}

export const labelRepository = new LabelRepository();
