import type { Provider } from '../entities/Provider.js';

export interface ProviderRepository {
  findByName(name: string): Promise<Provider | null>;

  findById(id: string): Promise<Provider | null>;

  ensure(name: string): Promise<Provider>;
}
