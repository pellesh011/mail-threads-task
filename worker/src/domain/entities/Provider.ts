import { randomUUID } from 'node:crypto';

export type ProviderId = string;

export class Provider {
  public readonly id: ProviderId;

  public readonly name: string;

  constructor(name: string) {
    this.id = randomUUID();

    this.name = name;
  }
}
