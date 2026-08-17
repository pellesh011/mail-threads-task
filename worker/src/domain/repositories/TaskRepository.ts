import { UUID } from 'node:crypto';
import { Task } from '../entities/Task.js';
import { TaskStatus } from '../enums/TaskStatus.js';
import { TaskType } from '../enums/TaskType.js';

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

  updateStatus(id: string, UUID: TaskStatus, error?: string): Promise<void>;
}
