import { Module } from '@nestjs/common';
import { KafkaSyncService } from './kafka-sync.service';
import { neo4jProvider } from '../config/neo4j.provider';

@Module({
  providers: [KafkaSyncService, neo4jProvider],
})
export class SyncModule {}
