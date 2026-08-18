import { randomUUID } from 'node:crypto';

export type ProviderId = string;

export interface CreateProviderParams {
  id?: string;

  name: string;
}

export class Provider {
  public readonly id: ProviderId;

  public readonly name: string;

  constructor(params: CreateProviderParams) {
    this.id = params.id ?? randomUUID();

    this.name = params.name;
  }
}
