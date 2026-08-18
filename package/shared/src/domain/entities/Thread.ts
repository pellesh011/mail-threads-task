import { Message } from './Message.js';
import { randomUUID } from 'node:crypto';

export type ThreadId = string;

export interface CreateThreadParams {
  id?: string;

  subject?: string;
}

export class Thread {
  public readonly id: ThreadId;

  public subject: string | null;

  private readonly messages: Message[] = [];

  constructor(params: CreateThreadParams = {}) {
    this.id = params.id ?? randomUUID();

    this.subject = params.subject ?? null;
  }

  public addMessage(message: Message): void {
    if (message.threadId !== this.id) {
      throw new Error(`Message ${message.id} belongs to another thread`);
    }

    this.messages.push(message);
  }

  public getMessages(): readonly Message[] {
    return this.messages;
  }
}
