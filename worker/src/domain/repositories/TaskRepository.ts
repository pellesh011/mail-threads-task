import { Task } from '../entities/Task.js';
import { TaskStatus } from '../enums/TaskStatus.js';

export interface TaskRepository {
  findByProviderAndType(providerId: string, type: string): Promise<Task | null>;

  create(params: {
    providerId: string;
    type: string;
    status: TaskStatus;
    data?: Record<string, unknown>;
  }): Promise<Task>;

  updateStatus(taskId: string, status: string, error?: string): Promise<void>;
}
