import { Module } from '@nestjs/common';
import { DomainRegistry, DOMAIN_ADAPTER } from './domain.registry';
import { EducationAdapter } from './adapters/education.adapter';
import { RentingAdapter } from './adapters/renting.adapter';
import { BookStoreAdapter } from './adapters/bookstore.adapter';
import { ManufacturingAdapter } from './adapters/manufacturing.adapter';

@Module({
  providers: [
    { provide: DOMAIN_ADAPTER, useClass: EducationAdapter, multi: true } as any,
    { provide: DOMAIN_ADAPTER, useClass: RentingAdapter, multi: true } as any,
    { provide: DOMAIN_ADAPTER, useClass: BookStoreAdapter, multi: true } as any,
    { provide: DOMAIN_ADAPTER, useClass: ManufacturingAdapter, multi: true } as any,
    DomainRegistry,
  ],
  exports: [DomainRegistry],
})
export class DomainModule {}
