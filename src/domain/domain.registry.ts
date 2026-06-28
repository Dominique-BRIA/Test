import { Injectable, Inject, Optional, NotFoundException } from '@nestjs/common';
import { IDomainAdapter } from '../shared/interfaces';

export const DOMAIN_ADAPTER = 'DOMAIN_ADAPTER';

@Injectable()
export class DomainRegistry {
  private readonly registry: Map<string, IDomainAdapter> = new Map();

  constructor(
    @Optional() @Inject(DOMAIN_ADAPTER) adapters: IDomainAdapter | IDomainAdapter[] = [],
  ) {
    const list = Array.isArray(adapters) ? adapters : [adapters];
    list.forEach((a) => this.registry.set(a.adapterName, a));
  }

  register(adapter: IDomainAdapter): void {
    this.registry.set(adapter.adapterName, adapter);
  }

  get(name: string): IDomainAdapter | undefined {
    return this.registry.get(name);
  }

  getAdapter(name: string): IDomainAdapter {
    const adapter = this.registry.get(name);
    if (!adapter) throw new NotFoundException(`Adapter '${name}' not found`);
    return adapter;
  }

  getAll(): IDomainAdapter[] {
    return Array.from(this.registry.values());
  }

  listAdapters(): { name: string; nodeTypes: string[]; relationTypes: string[] }[] {
    return this.getAll().map((a) => ({
      name: a.adapterName,
      nodeTypes: a.nodeTypes,
      relationTypes: a.relationTypes,
    }));
  }
}
