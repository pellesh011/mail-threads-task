import type { Task } from '../entities/Task.js';
import type { TaskStatus } from '../enums/TaskStatus.js';
import type { TaskType } from '../enums/TaskType.js';

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;

  findByProviderAndType(
    providerId: string,
    type: TaskType,
  ): Promise<Task | null>;

  save(params: {
    id: string;
    providerId: string;
    type: TaskType;
    status: TaskStatus;
    data?: Record<string, unknown>;
  }): Promise<Task>;

  updateStatus(id: string, status: TaskStatus, error?: string): Promise<void>;
}
