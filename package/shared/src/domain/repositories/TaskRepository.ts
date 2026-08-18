import type { UUID } from 'node:crypto';
import type { Task } from '../entities/Task.js';
import type { TaskStatus } from '../enums/TaskStatus.js';
import type { TaskType } from '../enums/TaskType.js';

export interface TaskRepository {
  findByProviderAndType(
    providerId: string,
    type: TaskType,
  ): Promise<Task | null>;

  save(params: {
    id: UUID;
    providerId: string;
    type: TaskType;
    status: TaskStatus;
    data?: Record<string, unknown>;
  }): Promise<Task>;

  updateStatus(id: string, status: TaskStatus, error?: string): Promise<void>;
}
