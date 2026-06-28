import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { neo4jProvider } from '../config/neo4j.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GraphController],
  providers: [GraphService, neo4jProvider],
  exports: [GraphService],
})
export class GraphModule {}
