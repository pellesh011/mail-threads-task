// domain/entities/Task.ts

import { randomUUID } from 'node:crypto';
import { TaskStatus } from '../enums/TaskStatus.js';
import { TaskType } from '../enums/TaskType.js';

export class Task {
  public readonly id: string;

  public readonly providerId: string;

  public readonly type: TaskType;

  public readonly data: Record<string, unknown>;

  private status: TaskStatus;

  private error?: string;

  constructor(params: {
    providerId: string;
    type: TaskType;
    data?: Record<string, unknown>;
  }) {
    this.id = randomUUID();

    this.providerId = params.providerId;

    this.type = params.type;

    this.data = params.data ?? {};

    this.status = TaskStatus.PENDING;
  }

  start(): void {
    this.status = TaskStatus.RUNNING;
  }

  complete(): void {
    this.status = TaskStatus.COMPLETED;
  }

  fail(error: string): void {
    this.status = TaskStatus.FAILED;
    this.error = error;
  }

  getStatus(): TaskStatus {
    return this.status;
  }

  getError(): string | undefined {
    return this.error;
  }
}
