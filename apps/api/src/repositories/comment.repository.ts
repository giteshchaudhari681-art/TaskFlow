import { BaseRepository } from './base.repository.js';

export interface CreateCommentData {
  taskId: string;
  authorId: string;
  content: string;
}

export class CommentRepository extends BaseRepository {
  private readonly authorSelect = {
    id: true,
    name: true,
    email: true,
    avatarUrl: true,
  };

  async create(data: CreateCommentData) {
    return this.db.comment.create({
      data: {
        taskId: data.taskId,
        authorId: data.authorId,
        content: data.content,
      },
      include: {
        author: {
          select: this.authorSelect,
        },
      },
    });
  }

  async findById(commentId: string, taskId: string) {
    return this.db.comment.findFirst({
      where: {
        id: commentId,
        taskId,
      },
      include: {
        author: {
          select: this.authorSelect,
        },
      },
    });
  }

  async listByTask(taskId: string, options?: { limit?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);
    return this.db.comment.findMany({
      where: {
        taskId,
      },
      include: {
        author: {
          select: this.authorSelect,
        },
      },
      orderBy: {
        createdAt: 'asc', // oldest to newest for conversation thread
      },
      take: limit,
    });
  }

  async update(commentId: string, content: string) {
    return this.db.comment.update({
      where: {
        id: commentId,
      },
      data: {
        content,
      },
      include: {
        author: {
          select: this.authorSelect,
        },
      },
    });
  }

  async softDelete(commentId: string) {
    return this.db.comment.update({
      where: {
        id: commentId,
      },
      data: {
        deletedAt: new Date(),
        content: 'This comment was deleted.',
      },
      include: {
        author: {
          select: this.authorSelect,
        },
      },
    });
  }

  async countByTask(taskId: string) {
    return this.db.comment.count({
      where: {
        taskId,
        deletedAt: null,
      },
    });
  }
}

export const commentRepository = new CommentRepository();
