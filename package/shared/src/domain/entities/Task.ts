import { randomUUID } from 'node:crypto';
import { TaskStatus } from '../enums/TaskStatus.js';
import { TaskType } from '../enums/TaskType.js';

export class Task {
  public readonly id: string;

  public readonly providerId: string;

  public readonly type: TaskType;

  public readonly data: Record<string, unknown>;

  public readonly startAt: Date | null;

  private status: TaskStatus;

  private error?: string;

  constructor(params: {
    id?: string;
    providerId: string;
    type: TaskType;
    data?: Record<string, unknown>;
    startAt?: Date | null;
    status?: TaskStatus;
    error?: string;
  }) {
    this.id = params.id ?? randomUUID();

    this.providerId = params.providerId;

    this.type = params.type;

    this.data = params.data ?? {};

    this.startAt = params.startAt ?? null;

    this.status = params.status ?? TaskStatus.PENDING;

    this.error = params.error;
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
