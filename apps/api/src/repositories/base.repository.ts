import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Base Repository providing access to the centralized Prisma client instance.
 * Future domain repositories (UserRepository, ProjectRepository, TaskRepository)
 * will extend this class to ensure consistent transaction and query boundaries.
 */
export abstract class BaseRepository {
  protected readonly db: PrismaClient;

  constructor(client: PrismaClient = prisma) {
    this.db = client;
  }
}
