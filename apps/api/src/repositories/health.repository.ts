import { BaseRepository } from './base.repository.js';
import { checkDatabaseHealth, DatabaseHealthResult } from '../lib/prisma.js';

export class HealthRepository extends BaseRepository {
  async pingDatabase(): Promise<DatabaseHealthResult> {
    return checkDatabaseHealth();
  }
}

export const healthRepository = new HealthRepository();
